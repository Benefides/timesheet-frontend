import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api, apiErrorMessage } from '../../lib/api';

dayjs.extend(relativeTime);

interface OdooStatus {
  configured: boolean;
  states: string[];
  activeOrders: number;
  lastSyncedAt: string | null;
  syncing: boolean;
  lastError: string | null;
}

/**
 * Where the SO dropdown's orders come from: how many are synced from Odoo,
 * when, and a way to pull new ones now. Admins only.
 */
export default function OdooSyncCard() {
  const qc = useQueryClient();
  const status = useQuery<OdooStatus>({
    queryKey: ['odoo-status'],
    queryFn: async () => (await api.get('/sales-orders/status')).data,
    refetchInterval: (q) => (q.state.data?.syncing ? 3000 : false),
  });

  const sync = useMutation({
    mutationFn: async () =>
      (await api.post<{ fetched: number; deactivated: number }>('/sales-orders/sync')).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['odoo-status'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });

  const s = status.data;
  if (!s) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>Odoo sales orders</Typography>
          {s.configured ? (
            <Typography variant="body2" color="text.secondary">
              {s.activeOrders} quotations and orders in the SO dropdown ·{' '}
              {s.lastSyncedAt ? `last synced ${dayjs(s.lastSyncedAt).fromNow()}` : 'not synced yet'}
              {' '}· refreshed automatically
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Not connected. SO numbers are typed by hand until Odoo is set up on the server.
            </Typography>
          )}
        </Box>
        {s.configured && (
          <Button
            variant="outlined"
            startIcon={sync.isPending || s.syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            disabled={sync.isPending || s.syncing}
            onClick={() => sync.mutate()}
            sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            Sync now
          </Button>
        )}
      </Stack>
      {sync.isSuccess && (
        <Alert severity="success" sx={{ mt: 1.5 }} onClose={() => sync.reset()}>
          Synced {sync.data.fetched} from Odoo
          {sync.data.deactivated ? `; ${sync.data.deactivated} no longer open were removed from the dropdown` : ''}.
        </Alert>
      )}
      {(sync.isError || (!sync.isPending && s.lastError)) && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          Couldn’t sync from Odoo: {sync.isError ? apiErrorMessage(sync.error) : s.lastError}. The dropdown
          keeps the orders from the last successful sync.
        </Alert>
      )}
    </Paper>
  );
}
