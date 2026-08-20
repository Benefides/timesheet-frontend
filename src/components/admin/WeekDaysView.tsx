import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { TeamTimesheet, TimesheetStatus } from '../../lib/types';

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'secondary' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  MANAGER_APPROVED: 'secondary',
  APPROVED: 'success',
  REJECTED: 'warning',
};

interface WeekDaysViewProps {
  weekStart: Dayjs;
  weeks: TeamTimesheet[];
  selectedDate: Dayjs | null;
  onSelectDate: (date: Dayjs) => void;
}

export default function WeekDaysView({
  weekStart,
  weeks,
  selectedDate,
  onSelectDate,
}: WeekDaysViewProps) {
  // Create a map of dates to weeks for quick lookup
  const weekMap = new Map<string, TeamTimesheet>();
  weeks.forEach((w) => {
    weekMap.set(dayjs(w.weekStart).format('YYYY-MM-DD'), w);
  });

  const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  const weekOfTheWeek = weekMap.get(weekStart.format('YYYY-MM-DD'));

  return (
    <Stack spacing={2}>
      {/* Days Grid */}
      <Stack direction="row" spacing={1}>
        {days.map((day) => {
          const isSelected = selectedDate && day.isSame(selectedDate, 'day');
          // All seven days belong to the SAME timesheet — the one keyed by the
          // week's Monday. Looking each day up by its own date only ever hit
          // for Monday, so Tue–Sun rendered "—" whatever was recorded.
          const dayTotal = weekOfTheWeek?.entries
            .filter((e) => dayjs(e.workDate).isSame(day, 'day'))
            .reduce((sum, e) => sum + Number(e.hours), 0) ?? 0;

          return (
            <Button
              key={day.format('YYYY-MM-DD')}
              variant={isSelected ? 'contained' : 'outlined'}
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
      {weekOfTheWeek && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              {weekStart.format('MMM D')} – {weekStart.add(6, 'day').format('MMM D')}
            </Typography>
            <Chip size="small" label={weekOfTheWeek.status.toLowerCase()} color={STATUS_COLOR[weekOfTheWeek.status]} />
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {weekOfTheWeek.totalHours} h · {weekOfTheWeek.billableHours} h billable
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
