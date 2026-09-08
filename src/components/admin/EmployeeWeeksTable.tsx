import { Fragment, useState } from 'react';
import {
  Box, Button, Chip, Collapse, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Tooltip, Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import dayjs from 'dayjs';
import type { TeamTimesheet, TimesheetEntry, TimesheetStatus } from '../../lib/types';
import { formatHours, formatMinutes, sumMinutes } from '../../lib/duration';
import { REVERTIBLE } from './WeekRevert';

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'secondary' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  MANAGER_APPROVED: 'secondary',
  APPROVED: 'success',
  REJECTED: 'warning',
};

interface EmployeeWeeksTableProps {
  weeks: TeamTimesheet[];
  isLoading: boolean;
  /** Admins only — every other role sees this table read-only. */
  canEdit?: boolean;
  onEditEntry?: (entry: TimesheetEntry, week: TeamTimesheet) => void;
  onDeleteEntry?: (entry: TimesheetEntry, week: TeamTimesheet) => void;
  /** Sends an approved week back to draft — admins only. */
  onRevertWeek?: (week: TeamTimesheet) => void;
}

export default function EmployeeWeeksTable({
  weeks,
  isLoading,
  canEdit = false,
  onEditEntry,
  onDeleteEntry,
  onRevertWeek,
}: EmployeeWeeksTableProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Paper variant="outlined">
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell />
            <TableCell>Week</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Billable</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Decided</TableCell>
            {canEdit && <TableCell align="right">Week</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7}>
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Loading…
                </Typography>
              </TableCell>
            </TableRow>
          ) : weeks.length ? (
            weeks.map((w) => (
              <Fragment key={w.id}>
                <TableRow hover>
                  <TableCell padding="checkbox">
                    <IconButton size="small" onClick={() => setOpen(open === w.id ? null : w.id)}>
                      {open === w.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {dayjs(w.weekStart).format('MMM D')} – {dayjs(w.weekStart).add(6, 'day').format('MMM D, YYYY')}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={w.status.toLowerCase()} color={STATUS_COLOR[w.status]} />
                  </TableCell>
                  <TableCell align="right">{formatHours(w.totalHours)}</TableCell>
                  <TableCell align="right">{formatHours(w.billableHours)}</TableCell>
                  <TableCell>{w.submittedAt ? dayjs(w.submittedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                  <TableCell>{w.decidedAt ? dayjs(w.decidedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      {REVERTIBLE.includes(w.status) && (
                        <Button size="small" color="warning" onClick={() => onRevertWeek?.(w)}>
                          Revert
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>

                <TableRow>
                  <TableCell colSpan={canEdit ? 8 : 7} sx={{ p: 0, border: 0 }}>
                    <Collapse in={open === w.id} unmountOnExit>
                      <Stack sx={{ px: 4, py: 3, bgcolor: 'action.hover' }} spacing={2}>
                        {[...Array(7)].map((_, i) => {
                          const day = dayjs(w.weekStart).add(i, 'day');
                          const dayKey = day.format('YYYY-MM-DD');
                          const dayEntries = w.entries.filter((e) => dayjs(e.workDate).format('YYYY-MM-DD') === dayKey);
                          const dayTotal = sumMinutes(dayEntries);

                          if (!dayEntries.length && dayTotal === 0) return null;

                          return (
                            <Box key={dayKey}>
                              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {day.format('dddd, D MMM')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {dayTotal ? formatMinutes(dayTotal) : '—'}
                                </Typography>
                              </Stack>
                              {dayEntries.length ? (
                                <Table size="small" sx={{ ml: 2 }}>
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
                                    {dayEntries.map((e) => (
                                      <TableRow key={e.id}>
                                        <TableCell>{e.project?.code ?? '—'}</TableCell>
                                        <TableCell>{e.description}</TableCell>
                                        <TableCell align="right">{formatHours(e.hours)}</TableCell>
                                        <TableCell>{e.isBillable ? 'Billable' : 'Non-billable'}</TableCell>
                                        {canEdit && (
                                          <TableCell align="right">
                                            <Tooltip
                                              title={
                                                w.status === 'APPROVED'
                                                  ? 'Revert the approved week before editing it'
                                                  : ''
                                              }
                                            >
                                              <span>
                                                <IconButton
                                                  size="small"
                                                  disabled={w.status === 'APPROVED'}
                                                  aria-label="Edit entry"
                                                  onClick={() => onEditEntry?.(e, w)}
                                                >
                                                  <EditOutlinedIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                  size="small"
                                                  disabled={w.status === 'APPROVED'}
                                                  aria-label="Delete entry"
                                                  onClick={() => onDeleteEntry?.(e, w)}
                                                >
                                                  <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                              </span>
                                            </Tooltip>
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                  No entries
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7}>
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No timesheets yet.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
