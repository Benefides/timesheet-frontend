import { Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { PendingItem } from '../../lib/types';

interface ApprovalsTableProps {
  items: PendingItem[];
  isLoading: boolean;
  onReject: (item: PendingItem) => void;
  onApprove: (id: string) => void;
  approvePending: boolean;
}

export default function ApprovalsTable({
  items,
  isLoading,
  onReject,
  onApprove,
  approvePending,
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
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" color="error" onClick={() => onReject(t)}>
                      Reject
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={approvePending}
                      onClick={() => onApprove(t.id)}
                    >
                      Approve
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6}>
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
