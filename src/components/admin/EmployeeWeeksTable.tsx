import { Fragment, useState } from 'react';
import {
  Box, Chip, Collapse, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import dayjs from 'dayjs';
import type { TeamTimesheet, TimesheetStatus } from '../../lib/types';

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'warning',
};

interface EmployeeWeeksTableProps {
  weeks: TeamTimesheet[];
  isLoading: boolean;
}

export default function EmployeeWeeksTable({ weeks, isLoading }: EmployeeWeeksTableProps) {
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
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7}>
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
                  <TableCell align="right">{w.totalHours} h</TableCell>
                  <TableCell align="right">{w.billableHours} h</TableCell>
                  <TableCell>{w.submittedAt ? dayjs(w.submittedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                  <TableCell>{w.decidedAt ? dayjs(w.decidedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                    <Collapse in={open === w.id} unmountOnExit>
                      <Stack sx={{ px: 4, py: 3, bgcolor: 'action.hover' }} spacing={2}>
                        {[...Array(7)].map((_, i) => {
                          const day = dayjs(w.weekStart).add(i, 'day');
                          const dayKey = day.format('YYYY-MM-DD');
                          const dayEntries = w.entries.filter((e) => dayjs(e.workDate).format('YYYY-MM-DD') === dayKey);
                          const dayTotal = dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);

                          if (!dayEntries.length && dayTotal === 0) return null;

                          return (
                            <Box key={dayKey}>
                              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {day.format('dddd, D MMM')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {dayTotal ? `${dayTotal} h` : '—'}
                                </Typography>
                              </Stack>
                              {dayEntries.length ? (
                                <Table size="small" sx={{ ml: 2 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Project</TableCell>
                                      <TableCell>Description</TableCell>
                                      <TableCell align="right">Hours</TableCell>
                                      <TableCell>Type</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {dayEntries.map((e) => (
                                      <TableRow key={e.id}>
                                        <TableCell>{e.project?.code ?? '—'}</TableCell>
                                        <TableCell>{e.description}</TableCell>
                                        <TableCell align="right">{e.hours}</TableCell>
                                        <TableCell>{e.isBillable ? 'Billable' : 'Non-billable'}</TableCell>
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
              <TableCell colSpan={7}>
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
