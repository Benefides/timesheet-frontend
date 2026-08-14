import { Box, Button } from '@mui/material';
import type { Timesheet } from '../../lib/types';

interface SubmitSectionProps {
  timesheet: Timesheet | undefined;
  editable: boolean;
  isPending: boolean;
  onSubmit: () => void;
}

export default function SubmitSection({
  timesheet,
  editable,
  isPending,
  onSubmit,
}: SubmitSectionProps) {
  const hasEntries = (timesheet?.entries.length ?? 0) > 0;

  if (!editable || !hasEntries) return null;

  return (
    <Box>
      <Button variant="contained" size="large" color="primary" disabled={isPending} onClick={onSubmit}>
        {timesheet?.status === 'SUBMITTED' ? 'Resubmit week' : 'Submit week for approval'}
      </Button>
    </Box>
  );
}
