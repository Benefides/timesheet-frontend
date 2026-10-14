import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField,
} from '@mui/material';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Project, TimesheetEntry } from '../../lib/types';
import { splitDuration, toDecimalHours } from '../../lib/duration';
import ProjectPicker from '../timesheet/ProjectPicker';
import SalesOrderField from '../timesheet/SalesOrderField';
import { OTHER_PROJECT_ID, projectFields } from '../../lib/entryProject';

export interface EntryPatch {
  /** Null for "Other", which sends customProjectName instead. */
  projectId: string | null;
  customProjectName: string | null;
  workDate: string;
  hours: number;
  /** Billable is derived from this on the server. */
  salesOrderNumber: string | null;
  description: string;
}

interface EntryEditDialogProps {
  /** The entry being corrected; null closes the dialog. */
  entry: TimesheetEntry | null;
  /** The seven days of the entry's week — an entry cannot move outside it. */
  days: Dayjs[];
  /** Projects the ENTRY'S OWNER may book to, not the admin's own. */
  projects: Project[];
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (patch: EntryPatch) => void;
}

/**
 * Administrative correction of a single entry. Every field an entry is created
 * with can be changed, including the day, so a misfiled entry is fixed in place
 * rather than deleted and retyped.
 */
export default function EntryEditDialog({
  entry,
  days,
  projects,
  isPending,
  error,
  onClose,
  onSave,
}: EntryEditDialogProps) {
  const [form, setForm] = useState({
    projectId: '',
    customProjectName: '',
    workDate: '',
    hours: '',
    minutes: '',
    salesOrderNumber: '',
    description: '',
  });

  // Reload the form whenever a different entry is opened — the dialog is a
  // single instance reused for every row.
  useEffect(() => {
    if (!entry) return;
    const { hours, minutes } = splitDuration(entry.hours);
    setForm({
      // An "Other" entry opens with Other selected and its typed name.
      projectId: entry.projectId ?? OTHER_PROJECT_ID,
      customProjectName: entry.customProjectName ?? '',
      workDate: dayjs(entry.workDate).format('YYYY-MM-DD'),
      hours: String(hours),
      minutes: String(minutes),
      salesOrderNumber: entry.salesOrderNumber ?? '',
      description: entry.description,
    });
  }, [entry]);

  const duration = toDecimalHours(form.hours, form.minutes);
  const isOther = form.projectId === OTHER_PROJECT_ID;
  const canSave = Boolean(
    form.projectId && (!isOther || form.customProjectName.trim()) && form.workDate && duration > 0 && duration <= 24 && form.description.trim(),
  );

  return (
    <Dialog open={Boolean(entry)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit time entry</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <ProjectPicker
            projects={projects}
            value={form.projectId}
            size="small"
            onChange={(p) =>
              setForm((f) => ({ ...f, projectId: p?.id ?? '' }))
            }
          />

          {isOther ? (
            <TextField
              label="Project name"
              size="small"
              required
              value={form.customProjectName}
              inputProps={{ maxLength: 160 }}
              helperText="Not in the project list. Once the project is set up, pick it above to file this entry under it."
              onChange={(e) => setForm((f) => ({ ...f, customProjectName: e.target.value }))}
            />
          ) : entry && !entry.projectId && (
            <Alert severity="info">
              Was logged as “Other: {entry.customProjectName}”. Saving files it under the project picked above.
            </Alert>
          )}

          <TextField
            select
            label="Day"
            size="small"
            value={form.workDate}
            onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))}
          >
            {days.map((d) => (
              <MenuItem key={d.format('YYYY-MM-DD')} value={d.format('YYYY-MM-DD')}>
                {d.format('dddd, D MMM')}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Hours"
              type="number"
              size="small"
              sx={{ flex: 1 }}
              value={form.hours}
              inputProps={{ min: 0, max: 24, step: 1 }}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
            />
            <TextField
              label="Minutes"
              type="number"
              size="small"
              sx={{ flex: 1 }}
              value={form.minutes}
              inputProps={{ min: 0, max: 59, step: 5 }}
              onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
            />
          </Stack>

          <TextField
            label="Description"
            size="small"
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <SalesOrderField
            value={form.salesOrderNumber}
            onChange={(salesOrderNumber) => setForm((f) => ({ ...f, salesOrderNumber }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canSave || isPending}
          onClick={() =>
            onSave({
              ...projectFields(form.projectId, form.customProjectName),
              workDate: form.workDate,
              hours: duration,
              salesOrderNumber: form.salesOrderNumber.trim() || null,
              description: form.description.trim(),
            })
          }
        >
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
