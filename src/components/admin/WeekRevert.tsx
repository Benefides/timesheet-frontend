import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api, apiErrorMessage } from '../../lib/api';
import type { TeamTimesheet, TimesheetStatus } from '../../lib/types';

/** Statuses the server will reopen. Anything else has nothing to revert. */
export const REVERTIBLE: TimesheetStatus[] = ['SUBMITTED', 'MANAGER_APPROVED', 'APPROVED'];

interface WeekRevertProps {
  /** The week awaiting confirmation; null keeps the dialog closed. */
  week: TeamTimesheet | null;
  onClose: () => void;
  /** Called once the week is back in draft, so the caller can refetch. */
  onReverted: () => void;
}

/**
 * Sends an approved week back to draft. Reverting undoes an approval and
 * reopens the week for editing, so it asks first and says what it will undo.
 */
export default function WeekRevert({ week, onClose, onReverted }: WeekRevertProps) {
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const revert = useMutation({
    mutationFn: async (id: string) => api.post(`/timesheets/${id}/reopen`),
    onSuccess: () => {
      close();
      onReverted();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const wasApproved = week?.status === 'APPROVED' || week?.status === 'MANAGER_APPROVED';

  return (
    <>
      <Dialog open={Boolean(week)} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>Revert this week to draft?</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <DialogContentText>
            {week
              ? `${week.user?.displayName ?? 'This employee'} · week of ${dayjs(week.weekStart).format('D MMM YYYY')}`
              : ''}
          </DialogContentText>
          <DialogContentText sx={{ mt: 1 }}>
            {wasApproved
              ? 'The approval is undone and the week reopens for editing. The reversal is recorded against your name.'
              : 'The week reopens for editing and has to be submitted again.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={revert.isPending}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={revert.isPending}
            onClick={() => week && revert.mutate(week.id)}
          >
            Revert to draft
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(error) && !week} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
