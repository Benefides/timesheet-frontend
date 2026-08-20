import { Box, Chip, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { Timesheet, TimesheetStatus } from '../../lib/types';

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'secondary' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  MANAGER_APPROVED: 'secondary',
  APPROVED: 'success',
  REJECTED: 'warning',
};

interface WeekHeaderProps {
  weekStart: string;
  timesheet: Timesheet | undefined;
}

export default function WeekHeader({ weekStart, timesheet }: WeekHeaderProps) {
  return (
    <Box>
      <Typography variant="h5">My timesheet</Typography>
      <Typography color="text.secondary">Week of {dayjs(weekStart).format('D MMM YYYY')}</Typography>
      {timesheet && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <Chip label={timesheet.status} color={STATUS_COLOR[timesheet.status]} />
          <Typography variant="body2" color="text.secondary">
            {timesheet.totalHours} h total · {timesheet.billableHours} h billable
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
