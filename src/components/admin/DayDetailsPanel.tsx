import {
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { TeamTimesheet, TimesheetEntry } from '../../lib/types';
import { formatHours, formatMinutes, sumMinutes } from '../../lib/duration';

interface DayDetailsPanelProps {
  selectedDate: Dayjs | null;
  weeks: TeamTimesheet[];
  /** Admins only — managers see this panel read-only. */
  canEdit?: boolean;
  onEditEntry?: (entry: TimesheetEntry) => void;
  onDeleteEntry?: (entry: TimesheetEntry) => void;
}

export default function DayDetailsPanel({
  selectedDate,
  weeks,
  canEdit = false,
  onEditEntry,
  onDeleteEntry,
}: DayDetailsPanelProps) {
  if (!selectedDate) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          Select a day to view details
        </Typography>
      </Paper>
    );
  }

  // Entries for the selected date, each kept alongside the week it belongs to:
  // the week's status decides whether that row may still be corrected.
  const rows = weeks.flatMap((w) =>
    w.entries
      .filter((e) => dayjs(e.workDate).isSame(selectedDate, 'day'))
      .map((entry) => ({ entry, week: w })),
  );

  const allEntries = rows.map((r) => r.entry);
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

      {rows.length ? (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell>Type</TableCell>
                {canEdit && <TableCell align="right">Edit</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ entry: e, week }) => {
                // A finally approved week is immutable: it has to be reverted
                // first, so the approval being undone is recorded.
                const locked = week.status === 'APPROVED';
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.project?.code ?? '—'}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell align="right">{formatHours(e.hours)}</TableCell>
                    <TableCell>{e.isBillable ? 'Billable' : 'Non-billable'}</TableCell>
                    {canEdit && (
                      <TableCell align="right">
                        <Tooltip title={locked ? 'Revert the approved week before editing it' : ''}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={locked}
                              aria-label="Edit entry"
                              onClick={() => onEditEntry?.(e)}
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              disabled={locked}
                              aria-label="Delete entry"
                              onClick={() => onDeleteEntry?.(e)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
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
