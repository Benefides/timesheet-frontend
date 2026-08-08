import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import type { AdminUser, Role, UserStatus } from '../lib/types';

const STATUS_COLOR: Record<UserStatus, 'default' | 'warning' | 'success'> = {
  ACTIVE: 'success', PENDING_SETUP: 'warning', DISABLED: 'default',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const users = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/users')).data,
  });
  const departments = useQuery<{ id: string; name: string }[]>({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data,
  });
  const managers = (users.data ?? []).filter((u) => u.role !== 'EMPLOYEE' && u.status === 'ACTIVE');

  const [form, setForm] = useState({ employeeCode: '', departmentId: '', managerId: '', role: 'EMPLOYEE' as Role });

  const openSetup = (u: AdminUser) => {
    setForm({ employeeCode: '', departmentId: '', managerId: '', role: 'EMPLOYEE' });
    setTarget(u);
  };

  const activate = useMutation({
    mutationFn: async () =>
      api.post(`/users/${target!.id}/profile`, {
        employeeCode: form.employeeCode,
        departmentId: form.departmentId,
        managerId: form.managerId || null,
        role: form.role,
      }),
    onSuccess: () => { setTarget(null); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">People</Typography>
        <Typography color="text.secondary">
          New sign-ins arrive as “pending” — complete a profile to let them record time.
        </Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {(users.data ?? []).map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.displayName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role.toLowerCase()}</TableCell>
                <TableCell><Chip size="small" label={u.status} color={STATUS_COLOR[u.status]} /></TableCell>
                <TableCell align="right">
                  {u.status === 'PENDING_SETUP' && (
                    <Button size="small" variant="contained" onClick={() => openSetup(u)}>
                      Complete setup
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {users.isLoading && (
              <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Set up {target?.displayName}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Employee code" value={form.employeeCode}
              onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))}
            />
            <TextField
              select label="Department" value={form.departmentId}
              onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
            >
              {(departments.data ?? []).map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Reporting manager" value={form.managerId}
              onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
            >
              <MenuItem value="">— none —</MenuItem>
              {managers.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.displayName}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Role" value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            >
              {(['EMPLOYEE', 'MANAGER', 'ADMIN'] as Role[]).map((r) => (
                <MenuItem key={r} value={r}>{r.toLowerCase()}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.employeeCode || !form.departmentId || activate.isPending}
            onClick={() => activate.mutate()}
          >
            Activate
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
