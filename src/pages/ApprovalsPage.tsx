import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api, apiErrorMessage } from '../lib/api';
import type { PendingItem } from '../lib/types';

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const [reject, setReject] = useState<PendingItem | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: queue = [], isLoading } = useQuery<PendingItem[]>({
    queryKey: ['pending'],
    queryFn: async () => (await api.get('/timesheets/pending')).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pending'] });
  };

  const approve = useMutation({
    mutationFn: async (id: string) => api.post(`/timesheets/${id}/approve`),
    onSuccess: invalidate,
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const doReject = useMutation({
    mutationFn: async () => api.post(`/timesheets/${reject!.id}/reject`, { comment }),
    onSuccess: () => { setReject(null); setComment(''); invalidate(); },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Approvals</Typography>
        <Typography color="text.secondary">Timesheets your team has submitted.</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

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
            {queue.length ? (
              queue.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.user.displayName}</TableCell>
                  <TableCell>{dayjs(t.weekStart).format('D MMM YYYY')}</TableCell>
                  <TableCell align="right">{t.totalHours} h</TableCell>
                  <TableCell align="right">{t.billableHours} h</TableCell>
                  <TableCell>{t.submittedAt ? dayjs(t.submittedAt).format('D MMM, HH:mm') : '—'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" color="error" onClick={() => setReject(t)}>Reject</Button>
                      <Button
                        size="small" variant="contained"
                        disabled={approve.isPending} onClick={() => approve.mutate(t.id)}
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
                    {isLoading ? 'Loading…' : 'Nothing waiting for approval. You’re all caught up.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(reject)} onClose={() => setReject(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject {reject?.user.displayName}’s week</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tell them what needs to change — a comment is required, and the week returns to them to fix.
          </Typography>
          <TextField
            autoFocus fullWidth multiline minRows={3} label="Reason"
            value={comment} onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReject(null)}>Cancel</Button>
          <Button
            color="error" variant="contained"
            disabled={!comment.trim() || doReject.isPending}
            onClick={() => doReject.mutate()}
          >
            Reject week
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
