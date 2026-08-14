import { Box, Button, IconButton, Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs, { type Dayjs } from 'dayjs';

interface WeekNavigationProps {
  weekStart: Dayjs;
  onWeekChange: (weekStart: Dayjs) => void;
}

function getMonday(date: Dayjs): Dayjs {
  const day = date.day();
  return day === 0 ? date.subtract(6, 'day') : date.startOf('week').add(1, 'day');
}

export default function WeekNavigationAdmin({ weekStart, onWeekChange }: WeekNavigationProps) {
  const currentMonday = getMonday(dayjs());
  const isCurrentWeek = weekStart.isSame(currentMonday, 'week');
  const isFutureWeek = weekStart.isAfter(currentMonday);
  const canGoForward = !isCurrentWeek && !isFutureWeek;

  const handleDateSelect = (date: Dayjs | null) => {
    if (date) {
      const monday = getMonday(date);
      // Allow selecting any past date for admin view, but not future
      if (monday.isAfter(currentMonday)) {
        return;
      }
      onWeekChange(monday);
    }
  };

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <IconButton size="small" onClick={() => onWeekChange(weekStart.subtract(1, 'week'))}>
        <ChevronLeftIcon />
      </IconButton>

      <Box sx={{ minWidth: 200 }}>
        <DatePicker
          value={weekStart}
          onChange={handleDateSelect}
          maxDate={currentMonday}
          slotProps={{
            textField: { size: 'small', fullWidth: true },
          }}
        />
      </Box>

      <IconButton
        size="small"
        disabled={!canGoForward}
        onClick={() => onWeekChange(weekStart.add(1, 'week'))}
      >
        <ChevronRightIcon />
      </IconButton>

      <Button
        size="small"
        variant={isCurrentWeek ? 'contained' : 'text'}
        onClick={() => onWeekChange(currentMonday)}
      >
        This week
      </Button>
    </Stack>
  );
}
