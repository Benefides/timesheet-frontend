import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { TeamTimesheet, TimesheetStatus } from '../../lib/types';
import { formatHours, formatMinutes, sumMinutes } from '../../lib/duration';
import { REVERTIBLE } from './WeekRevert';

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
  /** Undoing an approval is admin-only, so the button is too. */
  canRevert?: boolean;
  onRevert?: (week: TeamTimesheet) => void;
}

export default function WeekDaysView({
  weekStart,
  weeks,
  selectedDate,
  onSelectDate,
  canRevert = false,
  onRevert,
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
      <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }}>
        {days.map((day) => {
          const isSelected = selectedDate && day.isSame(selectedDate, 'day');
          // All seven days belong to the SAME timesheet — the one keyed by the
          // week's Monday. Looking each day up by its own date only ever hit
          // for Monday, so Tue–Sun rendered "—" whatever was recorded.
          const dayTotal = sumMinutes(
            weekOfTheWeek?.entries.filter((e) => dayjs(e.workDate).isSame(day, 'day')) ?? [],
          );

          return (
            <Button
              key={day.format('YYYY-MM-DD')}
              variant={isSelected ? 'contained' : 'outlined'}
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
      {weekOfTheWeek && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              {weekStart.format('MMM D')} – {weekStart.add(6, 'day').format('MMM D')}
            </Typography>
            <Chip size="small" label={weekOfTheWeek.status.toLowerCase()} color={STATUS_COLOR[weekOfTheWeek.status]} />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatHours(weekOfTheWeek.totalHours)} · {formatHours(weekOfTheWeek.billableHours)} billable
            </Typography>
            {canRevert && REVERTIBLE.includes(weekOfTheWeek.status) && (
              <Button size="small" color="warning" onClick={() => onRevert?.(weekOfTheWeek)}>
                Revert to draft
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
