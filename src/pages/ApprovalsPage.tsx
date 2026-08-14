import { useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import type { PendingItem } from '../lib/types';
import ApprovalsTable from '../components/approvals/ApprovalsTable';
import RejectDialog from '../components/approvals/RejectDialog';

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
    onSuccess: () => {
      setReject(null);
      setComment('');
      invalidate();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Approvals</Typography>
        <Typography color="text.secondary">Timesheets your team has submitted.</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <ApprovalsTable
        items={queue}
        isLoading={isLoading}
        onReject={setReject}
        onApprove={(id) => approve.mutate(id)}
        approvePending={approve.isPending}
      />

      <RejectDialog
        open={Boolean(reject)}
        item={reject}
        comment={comment}
        onCommentChange={setComment}
        onClose={() => setReject(null)}
        onConfirm={() => doReject.mutate()}
        isPending={doReject.isPending}
      />
    </Stack>
  );
}
