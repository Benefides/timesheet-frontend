import { useMemo, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, apiErrorMessage } from '../../lib/api';
import { formatHours } from '../../lib/duration';
import type { Project, TimesheetEntry } from '../../lib/types';
import EntryEditDialog, { type EntryPatch } from './EntryEditDialog';

interface EntryCorrectionsProps {
  /** The entry open in the editor, if any. */
  editing: TimesheetEntry | null;
  /** The entry awaiting delete confirmation, if any. */
  deleting: TimesheetEntry | null;
  /** Monday of the week the selected entry belongs to. */
  weekStart: Dayjs | null;
  /** Whose timesheet is being corrected — decides which projects are offered. */
  employeeId: string | null;
  onClose: () => void;
  /** Called after a change lands, so the caller can refetch. */
  onChanged: () => void;
}

/**
 * The administrative edit and delete flow for a single timesheet entry, shared
 * by every admin view that lists entries. Callers own only the selection; this
 * owns the requests, the errors and the dialogs.
 */
export default function EntryCorrections({
  editing,
  deleting,
  weekStart,
  employeeId,
  onClose,
  onChanged,
}: EntryCorrectionsProps) {
  const [error, setError] = useState<string | null>(null);

  // The editor must offer exactly the projects the server will accept: the
  // employee's own assignments, not the admin's.
  const projects = useQuery<Project[]>({
    queryKey: ['assigned-projects', employeeId],
    queryFn: async () => (await api.get(`/projects/assigned/${employeeId}`)).data,
    enabled: Boolean(employeeId),
  });

  const weekDays = useMemo(
    () => (weekStart ? [...Array(7)].map((_, i) => weekStart.add(i, 'day')) : []),
    [weekStart],
  );

  const close = () => {
    setError(null);
    onClose();
  };

  const updateEntry = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EntryPatch }) =>
      (await api.patch(`/timesheets/entries/${id}`, patch)).data,
    onSuccess: () => {
      close();
      onChanged();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => api.delete(`/timesheets/entries/${id}`),
    onSuccess: () => {
      close();
      onChanged();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <>
      <EntryEditDialog
        entry={editing}
        days={weekDays}
        projects={projects.data ?? []}
        isPending={updateEntry.isPending}
        error={editing ? error : null}
        onClose={close}
        onSave={(patch) => editing && updateEntry.mutate({ id: editing.id, patch })}
      />

      <Dialog open={Boolean(deleting)} onClose={close}>
        <DialogTitle>Delete this entry?</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <DialogContentText>
            {deleting
              ? `${formatHours(deleting.hours)} on ${dayjs(deleting.workDate).format('D MMM')} — ${deleting.description}`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={deleteEntry.isPending}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteEntry.isPending}
            onClick={() => deleting && deleteEntry.mutate(deleting.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* A failure with both dialogs closed still has to surface somewhere. */}
      <Snackbar
        open={Boolean(error) && !editing && !deleting}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
