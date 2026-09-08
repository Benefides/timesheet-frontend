import { Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { TeamTimesheet } from '../../lib/types';
import { formatHours, formatMinutes, sumMinutes } from '../../lib/duration';

interface DayDetailsPanelProps {
  selectedDate: Dayjs | null;
  weeks: TeamTimesheet[];
}

export default function DayDetailsPanel({ selectedDate, weeks }: DayDetailsPanelProps) {
  if (!selectedDate) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          Select a day to view details
        </Typography>
      </Paper>
    );
  }

  // Find entries for the selected date
  const allEntries = weeks.flatMap((w) =>
    w.entries.filter((e) => dayjs(e.workDate).isSame(selectedDate, 'day')),
  );

  const dayTotal = sumMinutes(allEntries);
  const billableTotal = sumMinutes(allEntries.filter((e) => e.isBillable));

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {selectedDate.format('dddd, D MMMM YYYY')}
        </Typography>
        <Stack direction="row" spacing={2}>
          <div>
            <Typography variant="caption" color="text.secondary">
              Total time
            </Typography>
            <Typography variant="h6">{dayTotal ? formatMinutes(dayTotal) : '—'}</Typography>
          </div>
          <div>
            <Typography variant="caption" color="text.secondary">
              Billable
            </Typography>
            <Typography variant="h6">
              {billableTotal ? formatMinutes(billableTotal) : '—'}
            </Typography>
          </div>
        </Stack>
      </Paper>

      {allEntries.length ? (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.project?.code ?? '—'}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell align="right">{formatHours(e.hours)}</TableCell>
                  <TableCell>{e.isBillable ? 'Billable' : 'Non-billable'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography color="text.secondary" variant="body2">
            No entries for this day.
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}
