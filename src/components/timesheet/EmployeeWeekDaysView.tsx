import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import type { Timesheet, TimesheetStatus } from '../../lib/types';
import { formatHours, formatMinutes, sumMinutes } from '../../lib/duration';

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'secondary' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  MANAGER_APPROVED: 'secondary',
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
      <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }}>
        {days.map((day) => {
          const isSelected = selectedDate && day.isSame(selectedDate, 'day');
          const dayEntries = timesheet?.entries.filter((e) =>
            dayjs(e.workDate).isSame(day, 'day'),
          ) ?? [];
          const dayTotal = sumMinutes(dayEntries);

          return (
            <Button
              key={day.format('YYYY-MM-DD')}
              variant={isSelected ? 'contained' : 'outlined'}
              disabled={!editable && dayTotal === 0}
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: { xs: 72, sm: 100 },
                p: { xs: 0.5, sm: 1 },
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => onSelectDate(day)}
            >
              <Typography variant="subtitle2" sx={{ fontSize: { xs: 11, sm: 14 } }}>{day.format('ddd')}</Typography>
              <Typography variant="h6">{day.format('D')}</Typography>
              {/* "7h 30m" may break onto two lines on a phone rather than overflow. */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: 10, sm: 12 }, lineHeight: 1.2, textAlign: 'center' }}
              >
                {dayTotal ? formatMinutes(dayTotal) : '—'}
              </Typography>
            </Button>
          );
        })}
      </Stack>

      {/* Status Bar */}
      {timesheet && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              {weekStart.format('MMM D')} – {weekStart.add(6, 'day').format('MMM D')}
            </Typography>
            <Chip size="small" label={timesheet.status.toLowerCase()} color={STATUS_COLOR[timesheet.status]} />
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatHours(timesheet.totalHours)} · {formatHours(timesheet.billableHours)} billable
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
