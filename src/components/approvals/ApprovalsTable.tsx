import { Fragment, useState } from 'react';
import {
  Button, Chip, Collapse, IconButton, Paper, Stack, Table, TableBody, TableContainer, TableCell, TableHead, TableRow,
  Tooltip, Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import dayjs from 'dayjs';
import { Link as RouterLink } from 'react-router-dom';
import type { PendingItem } from '../../lib/types';
import { formatHours, toMinutes } from '../../lib/duration';
import ApprovalWeekDetails from './ApprovalWeekDetails';
import { WEEKLY_TARGET_HOURS } from '../../lib/weeklyTarget';
import TargetPercentChip from '../common/TargetPercentChip';

const COLUMNS = 9;

interface ApprovalsTableProps {
  items: PendingItem[];
  isLoading: boolean;
  onReject: (item: PendingItem) => void;
  onApprove: (id: string) => void;
  approvePending: boolean;
  onRevert: (id: string) => void;
  revertPending: boolean;
  /** Undoing an approval is admin-only; managers keep revert on submitted weeks. */
  isAdmin: boolean;
}

/** The week's full detail in the timesheet viewer, opened on this person and week. */
function timesheetLink(t: PendingItem): string {
  const params = new URLSearchParams({
    employee: t.user.id,
    week: t.weekStart.slice(0, 10),
    from: 'approvals',
  });
  return `/admin/timesheets?${params}`;
}

export default function ApprovalsTable({
  items,
  isLoading,
  onReject,
  onApprove,
  approvePending,
  onRevert,
  revertPending,
  isAdmin,
}: ApprovalsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const allExpanded = items.length > 0 && items.every((t) => expanded.has(t.id));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Tooltip title={allExpanded ? 'Hide all daily details' : 'Show all daily details'}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={!items.length}
                      onClick={() => setExpanded(allExpanded ? new Set() : new Set(items.map((t) => t.id)))}
                    >
                      {allExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Week</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Of {WEEKLY_TARGET_HOURS}h</TableCell>
              <TableCell align="right">Billable</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Stage</TableCell>
              <TableCell align="right">Decision</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length ? (
              items.map((t) => (
                <Fragment key={t.id}>
                  <TableRow hover sx={{ '& > td': { borderBottom: expanded.has(t.id) ? 'unset' : undefined } }}>
                    <TableCell padding="checkbox">
                      <Tooltip title={expanded.has(t.id) ? 'Hide daily details' : 'Show daily details'}>
                        <IconButton size="small" onClick={() => toggle(t.id)}>
                          {expanded.has(t.id) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{t.user.displayName}</TableCell>
                    <TableCell>{dayjs(t.weekStart).format('D MMM YYYY')}</TableCell>
                    <TableCell align="right">{formatHours(t.totalHours)}</TableCell>
                    <TableCell align="right">
                      <TargetPercentChip loggedMinutes={toMinutes(t.totalHours)} />
                    </TableCell>
                    <TableCell align="right">{formatHours(t.billableHours)}</TableCell>
                    <TableCell>{t.submittedAt ? dayjs(t.submittedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={t.status === 'MANAGER_APPROVED' ? 'manager approved' : 'submitted'}
                        color={t.status === 'MANAGER_APPROVED' ? 'secondary' : 'info'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
                        <Button
                          size="small"
                          startIcon={<VisibilityOutlinedIcon />}
                          component={RouterLink}
                          to={timesheetLink(t)}
                        >
                          View
                        </Button>
                        {(isAdmin || t.status === 'SUBMITTED') && (
                          <Button size="small" disabled={revertPending} onClick={() => onRevert(t.id)}>
                            Revert to draft
                          </Button>
                        )}
                        <Button size="small" color="error" onClick={() => onReject(t)}>
                          Reject
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={approvePending}
                          onClick={() => onApprove(t.id)}
                        >
                          {t.status === 'MANAGER_APPROVED' ? 'Final approve' : 'Approve'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={COLUMNS} sx={{ py: 0, ...(expanded.has(t.id) ? {} : { borderBottom: 'none' }) }}>
                      <Collapse in={expanded.has(t.id)} timeout="auto" unmountOnExit>
                        <ApprovalWeekDetails weekStart={t.weekStart} entries={t.entries ?? []} />
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={COLUMNS}>
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    {isLoading ? 'Loading…' : "Nothing waiting for approval. You're all caught up."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
