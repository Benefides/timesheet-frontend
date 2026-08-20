import { Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { PendingItem } from '../../lib/types';

interface ApprovalsTableProps {
  items: PendingItem[];
  isLoading: boolean;
  onReject: (item: PendingItem) => void;
  onApprove: (id: string) => void;
  approvePending: boolean;
  onRevert: (id: string) => void;
  revertPending: boolean;
}

export default function ApprovalsTable({
  items,
  isLoading,
  onReject,
  onApprove,
  approvePending,
  onRevert,
  revertPending,
}: ApprovalsTableProps) {
  return (
    <Paper variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Week</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Billable</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell align="right">Decision</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length ? (
            items.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>{t.user.displayName}</TableCell>
                <TableCell>{dayjs(t.weekStart).format('D MMM YYYY')}</TableCell>
                <TableCell align="right">{t.totalHours} h</TableCell>
                <TableCell align="right">{t.billableHours} h</TableCell>
                <TableCell>{t.submittedAt ? dayjs(t.submittedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={t.status === 'MANAGER_APPROVED' ? 'manager approved' : 'submitted'}
                    color={t.status === 'MANAGER_APPROVED' ? 'secondary' : 'info'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" disabled={revertPending} onClick={() => onRevert(t.id)}>
                      Revert to draft
                    </Button>
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
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  {isLoading ? 'Loading…' : "Nothing waiting for approval. You're all caught up."}
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
