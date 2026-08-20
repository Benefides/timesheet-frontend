import { Fragment, useState } from 'react';
import {
  Chip, Collapse, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import dayjs from 'dayjs';
import type { TeamTimesheet, TimesheetStatus } from '../../lib/types';

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'secondary' | 'success' | 'warning'> = {
  DRAFT: 'default',
  SUBMITTED: 'info',
  MANAGER_APPROVED: 'secondary',
  APPROVED: 'success',
  REJECTED: 'warning',
};

interface TeamTimesheetsTableProps {
  items: TeamTimesheet[];
  isLoading: boolean;
}

export default function TeamTimesheetsTable({ items, isLoading }: TeamTimesheetsTableProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Paper variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Employee</TableCell>
            <TableCell>Week</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Billable</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Decided</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length ? (
            items.map((t) => (
              <Fragment key={t.id}>
                <TableRow hover>
                  <TableCell padding="checkbox">
                    <IconButton
                      size="small"
                      disabled={!t.entries.length}
                      onClick={() => setOpen(open === t.id ? null : t.id)}
                    >
                      {open === t.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    {t.user.displayName}
                    {t.user.employeeCode ? ` (${t.user.employeeCode})` : ''}
                  </TableCell>
                  <TableCell>{dayjs(t.weekStart).format('D MMM YYYY')}</TableCell>
                  <TableCell>
                    <Chip size="small" label={t.status.toLowerCase()} color={STATUS_COLOR[t.status]} />
                  </TableCell>
                  <TableCell align="right">{t.totalHours} h</TableCell>
                  <TableCell align="right">{t.billableHours} h</TableCell>
                  <TableCell>{t.submittedAt ? dayjs(t.submittedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                  <TableCell>{t.decidedAt ? dayjs(t.decidedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                    <Collapse in={open === t.id} unmountOnExit>
                      <Stack sx={{ px: 7, py: 2, bgcolor: 'action.hover' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Project</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell align="right">Hours</TableCell>
                              <TableCell>Billable</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {t.entries.map((e) => (
                              <TableRow key={e.id}>
                                <TableCell>{dayjs(e.workDate).format('ddd D MMM')}</TableCell>
                                <TableCell>
                                  {e.project ? `${e.project.code} — ${e.project.name}` : '—'}
                                </TableCell>
                                <TableCell>{e.description}</TableCell>
                                <TableCell align="right">{e.hours} h</TableCell>
                                <TableCell>{e.isBillable ? 'Yes' : 'No'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Stack>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8}>
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  {isLoading ? 'Loading…' : 'No timesheets match this filter yet.'}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
