import { useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { useMe } from '../lib/hooks';
import type { AdminAssignment, AdminProject, AdminUser } from '../lib/types';

/** An assignment currently in force (its window covers today). */
function isCurrent(a: AdminAssignment): boolean {
  return !a.effectiveTo || dayjs(a.effectiveTo).isAfter(dayjs().subtract(1, 'day'));
}

export default function AdminProjectsPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const projects = useQuery<AdminProject[]>({
    queryKey: ['admin-projects'],
    queryFn: async () => (await api.get('/projects')).data,
  });
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';
  // Role-scoped: managers see (and can enroll) their own team; admins everyone.
  const users = useQuery<AdminUser[]>({
    queryKey: ['org-users'],
    queryFn: async () => (await api.get('/users/team')).data,
  });
  const activeUsers = (users.data ?? []).filter((u) => u.status === 'ACTIVE');

  // ---- Create / edit ----
  const emptyDraft = { code: '', name: '', isBillable: true };
  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminProject | null>(null);

  const create = useMutation({
    mutationFn: async () => api.post('/projects', draft),
    onSuccess: () => {
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Pick<AdminProject, 'name' | 'isBillable' | 'isActive'>>) =>
      api.patch(`/projects/${editing!.id}`, patch),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/projects/${editing!.id}`),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['admin-projects'] });
    },
    // A 409 lands here when the project has recorded time — archive instead.
    onError: (e) => { setEditing(null); setError(apiErrorMessage(e)); },
  });

  // ---- Enrollment ----
  const [managing, setManaging] = useState<AdminProject | null>(null);

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h5">Projects</Typography>
          <Typography color="text.secondary">
            Time can only be recorded against a project someone is enrolled in.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => { setDraft(emptyDraft); setCreating(true); }}>
          New project
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Billable</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {(projects.data ?? []).map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{p.code}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.isBillable ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={p.isActive ? 'active' : 'archived'}
                    color={p.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setManaging(p)}>People</Button>
                  <Button size="small" onClick={() => setEditing(p)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
            {projects.isLoading && (
              <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ---- New project ---- */}
      <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="sm">
        <DialogTitle>New project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Code" value={draft.code} placeholder="e.g. ACME"
              helperText="Short unique identifier shown in the timesheet grid"
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
            />
            <TextField
              label="Name" value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={draft.isBillable}
                  onChange={(e) => setDraft((d) => ({ ...d, isBillable: e.target.checked }))}
                />
              }
              label="Billable"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreating(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft.code.trim() || !draft.name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Edit project ---- */}
      {editing && (
        <EditProjectDialog
          project={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => update.mutate(patch)}
          saving={update.isPending}
          onDelete={isAdmin ? () => remove.mutate() : undefined}
          deleting={remove.isPending}
        />
      )}

      {/* ---- Enrollment ---- */}
      {managing && (
        <EnrollmentDialog
          project={managing}
          activeUsers={activeUsers}
          onClose={() => setManaging(null)}
          onError={setError}
        />
      )}
    </Stack>
  );
}

function EditProjectDialog({
  project, onClose, onSave, saving, onDelete, deleting,
}: {
  project: AdminProject;
  onClose: () => void;
  onSave: (patch: { name: string; isBillable: boolean; isActive: boolean }) => void;
  saving: boolean;
  onDelete?: () => void;
  deleting: boolean;
}) {
  const [form, setForm] = useState({
    name: project.name, isBillable: project.isBillable, isActive: project.isActive,
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit {project.code}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isBillable}
                onChange={(e) => setForm((f) => ({ ...f, isBillable: e.target.checked }))}
              />
            }
            label="Billable"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            }
            label="Active (archived projects disappear from timesheet entry)"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        {onDelete && (
          <Button
            color="error"
            sx={{ mr: 'auto' }}
            disabled={deleting}
            onClick={() => (confirmingDelete ? onDelete() : setConfirmingDelete(true))}
          >
            {confirmingDelete ? 'Really delete?' : 'Delete'}
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!form.name.trim() || saving}
          onClick={() => onSave(form)}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EnrollmentDialog({
  project, activeUsers, onClose, onError,
}: {
  project: AdminProject;
  activeUsers: AdminUser[];
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');

  const assignments = useQuery<AdminAssignment[]>({
    queryKey: ['assignments', project.id],
    queryFn: async () => (await api.get(`/projects/${project.id}/assignments`)).data,
  });

  const current = (assignments.data ?? []).filter(isCurrent);
  const enrolledIds = new Set(current.map((a) => a.userId));
  const candidates = activeUsers.filter((u) => !enrolledIds.has(u.id));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['assignments', project.id] });
    qc.invalidateQueries({ queryKey: ['my-projects'] }); // own timesheet dropdown
  };

  // Enrollments start at Jan 1 so earlier weeks of the current year stay bookable.
  const from = dayjs().startOf('year').format('YYYY-MM-DD');

  const enroll = useMutation({
    mutationFn: async (uid: string) =>
      api.post(`/projects/${project.id}/assignments`, { userId: uid, effectiveFrom: from }),
    onSuccess: () => { setUserId(''); refresh(); },
    onError: (e) => onError(apiErrorMessage(e)),
  });

  const enrollAll = useMutation({
    mutationFn: async () => {
      for (const u of candidates) {
        // eslint-disable-next-line no-await-in-loop
        await api.post(`/projects/${project.id}/assignments`, { userId: u.id, effectiveFrom: from });
      }
    },
    onSuccess: refresh,
    onError: (e) => { onError(apiErrorMessage(e)); refresh(); },
  });

  const unenroll = useMutation({
    mutationFn: async (assignmentId: string) =>
      api.delete(`/projects/${project.id}/assignments/${assignmentId}`),
    onSuccess: refresh,
    onError: (e) => onError(apiErrorMessage(e)),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>People on {project.code}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              select fullWidth size="small" label="Add person" value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {candidates.length === 0 && <MenuItem value="" disabled>Everyone is enrolled</MenuItem>}
              {candidates.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.displayName}</MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              disabled={!userId || enroll.isPending}
              onClick={() => enroll.mutate(userId)}
            >
              Add
            </Button>
            <Button
              variant="outlined"
              sx={{ whiteSpace: 'nowrap' }}
              disabled={candidates.length === 0 || enrollAll.isPending}
              onClick={() => enrollAll.mutate()}
            >
              Add everyone
            </Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Since</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {current.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.user.displayName}</TableCell>
                  <TableCell>{dayjs(a.effectiveFrom).format('D MMM YYYY')}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="End enrollment (history is kept)">
                      <span>
                        <IconButton
                          size="small"
                          disabled={unenroll.isPending}
                          onClick={() => unenroll.mutate(a.id)}
                        >
                          <PersonRemoveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!assignments.isLoading && current.length === 0 && (
                <TableRow><TableCell colSpan={3}>Nobody enrolled yet.</TableCell></TableRow>
              )}
              {assignments.isLoading && (
                <TableRow><TableCell colSpan={3}>Loading…</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
