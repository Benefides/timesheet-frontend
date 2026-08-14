import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import type { Timesheet, TimesheetStatus } from '../../lib/types';

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'warning',
};

interface EmployeeWeekDaysViewProps {
  weekStart: Dayjs;
  timesheet: Timesheet | undefined;
  selectedDate: Dayjs | null;
  onSelectDate: (date: Dayjs) => void;
  editable: boolean;
}

export default function EmployeeWeekDaysView({
  weekStart,
  timesheet,
  selectedDate,
  onSelectDate,
  editable,
}: EmployeeWeekDaysViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));

  return (
    <Stack spacing={2}>
      {/* Days Grid */}
      <Stack direction="row" spacing={1}>
        {days.map((day) => {
          const isSelected = selectedDate && day.isSame(selectedDate, 'day');
          const dayEntries = timesheet?.entries.filter((e) =>
            dayjs(e.workDate).isSame(day, 'day'),
          ) ?? [];
          const dayTotal = dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);

          return (
            <Button
              key={day.format('YYYY-MM-DD')}
              variant={isSelected ? 'contained' : 'outlined'}
              disabled={!editable && dayTotal === 0}
              sx={{
                flex: 1,
                minHeight: 100,
                p: 1,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => onSelectDate(day)}
            >
              <Typography variant="subtitle2">{day.format('ddd')}</Typography>
              <Typography variant="h6">{day.format('D')}</Typography>
              <Typography variant="caption" color="text.secondary">
                {dayTotal ? `${dayTotal} h` : '—'}
              </Typography>
            </Button>
          );
        })}
      </Stack>

      {/* Status Bar */}
      {timesheet && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              {weekStart.format('MMM D')} – {weekStart.add(6, 'day').format('MMM D')}
            </Typography>
            <Chip size="small" label={timesheet.status.toLowerCase()} color={STATUS_COLOR[timesheet.status]} />
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {timesheet.totalHours} h · {timesheet.billableHours} h billable
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
