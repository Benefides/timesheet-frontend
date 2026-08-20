import { Alert } from '@mui/material';
import type { Timesheet } from '../../lib/types';

interface StatusAlertsProps {
  timesheet: Timesheet | undefined;
  error: string | null;
  onErrorClear: () => void;
}

export default function StatusAlerts({ timesheet, error, onErrorClear }: StatusAlertsProps) {
  return (
    <>
      {timesheet?.status === 'REJECTED' && (
        <Alert severity="warning">This week was rejected. Adjust the entries and submit again.</Alert>
      )}
      {timesheet?.status === 'SUBMITTED' && (
        <Alert severity="info">
          Submitted and awaiting approval. You can still add time and resubmit until it's decided.
        </Alert>
      )}
      {timesheet?.status === 'MANAGER_APPROVED' && (
        <Alert severity="info">Approved by your manager — awaiting final admin approval.</Alert>
      )}
      {timesheet?.status === 'APPROVED' && (
        <Alert severity="success">Approved and locked. Approved time can't be edited.</Alert>
      )}
      {error && <Alert severity="error" onClose={onErrorClear}>{error}</Alert>}
    </>
  );
}
