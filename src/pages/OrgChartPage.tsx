import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { useMe } from '../lib/hooks';
import type { AdminUser, Department, Role } from '../lib/types';

const ROLE_COLOR: Record<Role, 'default' | 'primary' | 'secondary'> = {
  EMPLOYEE: 'default', MANAGER: 'primary', ADMIN: 'secondary',
};

interface TreeNode {
  user: AdminUser;
  children: TreeNode[];
}

/**
 * Build the reporting forest from the flat user list. Roots are people with no
 * manager (or whose manager isn't in the list, e.g. deactivated) — so nobody
 * ever silently disappears from the chart.
 */
function buildForest(users: AdminUser[]): TreeNode[] {
  const byId = new Map(users.map((u) => [u.id, { user: u, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.user.managerId ? byId.get(node.user.managerId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const byName = (a: TreeNode, b: TreeNode) => a.user.displayName.localeCompare(b.user.displayName);
  for (const node of byId.values()) node.children.sort(byName);
  return roots.sort(byName);
}

/** Everyone in a node's subtree, self included — these can't become its manager. */
function subtreeIds(node: TreeNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(node.user.id);
  for (const c of node.children) subtreeIds(c, acc);
  return acc;
}

export default function OrgChartPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [managerId, setManagerId] = useState('');

  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';

  // Role-scoped on the server: employees get their own team, managers their
  // subtree, admins the whole organisation.
  const users = useQuery<AdminUser[]>({
    queryKey: ['org-users'],
    queryFn: async () => (await api.get('/users/team')).data,
  });

  const forest = useMemo(() => buildForest(users.data ?? []), [users.data]);

  // Client-side guardrails; the API independently enforces the same rules.
  const blockedIds = useMemo(() => {
    if (!target) return new Set<string>();
    const node = forest.length
      ? findNode(forest, target.id)
      : null;
    return node ? subtreeIds(node) : new Set([target.id]);
  }, [forest, target]);

  const candidates = (users.data ?? []).filter(
    (u) => u.status === 'ACTIVE' && u.role !== 'EMPLOYEE' && !blockedIds.has(u.id),
  );

  const setManager = useMutation({
    mutationFn: async () =>
      api.patch(`/users/${target!.id}/manager`, { managerId: managerId || null }),
    onSuccess: () => {
      setTarget(null);
      qc.invalidateQueries({ queryKey: ['org-users'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const open = (u: AdminUser) => {
    setManagerId(u.managerId ?? '');
    setTarget(u);
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Organisation</Typography>
        <Typography color="text.secondary">
          Who reports to whom. Submitted weeks land in the reporting manager’s approval queue,
          so everyone recording time should have a manager here.
        </Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        {users.isLoading && <Typography>Loading…</Typography>}
        {!users.isLoading && forest.length === 0 && <Typography>No people yet.</Typography>}
        <Stack spacing={0.5}>
          {forest.map((n) => (
            <TreeRow key={n.user.id} node={n} depth={0} onSetManager={open} />
          ))}
        </Stack>
      </Paper>

      {isAdmin && <DepartmentsCard onError={setError} />}

      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Manager for {target?.displayName}</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth label="Reports to" value={managerId} sx={{ mt: 1 }}
            onChange={(e) => setManagerId(e.target.value)}
            helperText="Only active managers and admins can approve time. People in this person’s own reporting line are excluded."
          >
            <MenuItem value="">— nobody (top of the chart) —</MenuItem>
            {candidates.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.displayName}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={setManager.isPending || (target ? (managerId || null) === (target.managerId ?? null) : true)}
            onClick={() => setManager.mutate()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );

  function TreeRow({ node, depth, onSetManager }: {
    node: TreeNode; depth: number; onSetManager: (u: AdminUser) => void;
  }) {
    const u = node.user;
    return (
      <>
        <Stack
          direction="row" alignItems="center" spacing={1}
          sx={{
            pl: depth * 4, py: 0.75, borderRadius: 1,
            '&:hover': { bgcolor: 'action.hover' },
            '&:hover .row-actions': { visibility: 'visible' },
          }}
        >
          {depth > 0 && <Box sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>└─</Box>}
          {node.children.length > 0
            ? <SupervisorAccountIcon fontSize="small" color="action" />
            : <AccountTreeIcon fontSize="small" sx={{ visibility: 'hidden' }} />}
          <Typography sx={{ fontWeight: node.children.length > 0 ? 600 : 400 }}>
            {u.displayName}
          </Typography>
          <Chip size="small" label={u.role.toLowerCase()} color={ROLE_COLOR[u.role]} variant="outlined" />
          {u.status !== 'ACTIVE' && <Chip size="small" label={u.status.toLowerCase()} color="warning" />}
          {node.children.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {node.children.length} report{node.children.length === 1 ? '' : 's'}
            </Typography>
          )}
          {isAdmin && (
            <Box className="row-actions" sx={{ visibility: 'hidden', ml: 'auto' }}>
              <Button size="small" onClick={() => onSetManager(u)}>
                {u.managerId ? 'Change manager' : 'Set manager'}
              </Button>
            </Box>
          )}
        </Stack>
        {node.children.map((c) => (
          <TreeRow key={c.user.id} node={c} depth={depth + 1} onSetManager={onSetManager} />
        ))}
      </>
    );
  }
}

function findNode(forest: TreeNode[], id: string): TreeNode | null {
  for (const n of forest) {
    if (n.user.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

function DepartmentsCard({ onError }: { onError: (msg: string) => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ name: '', costCode: '' });
  const [editing, setEditing] = useState<Department | null>(null);
  const [editForm, setEditForm] = useState({ name: '', costCode: '' });

  const departments = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/departments', {
        name: draft.name.trim(),
        ...(draft.costCode.trim() ? { costCode: draft.costCode.trim() } : {}),
      }),
    onSuccess: () => { setDraft({ name: '', costCode: '' }); refresh(); },
    onError: (e) => onError(apiErrorMessage(e)),
  });

  const rename = useMutation({
    mutationFn: async () =>
      api.patch(`/departments/${editing!.id}`, {
        name: editForm.name.trim(),
        ...(editForm.costCode.trim() ? { costCode: editForm.costCode.trim() } : {}),
      }),
    onSuccess: () => { setEditing(null); refresh(); },
    onError: (e) => onError(apiErrorMessage(e)),
  });

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Departments</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Assigned to each person during activation on the People page.
      </Typography>

      <Stack spacing={1} sx={{ mb: 2 }}>
        {(departments.data ?? []).map((d) => (
          <Stack
            key={d.id} direction="row" alignItems="center" spacing={1}
            sx={{
              py: 0.5, px: 1, borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              '&:hover .row-actions': { visibility: 'visible' },
            }}
          >
            <Typography>{d.name}</Typography>
            {d.costCode && (
              <Chip size="small" variant="outlined" label={d.costCode} sx={{ fontFamily: 'monospace' }} />
            )}
            <Box className="row-actions" sx={{ visibility: 'hidden', ml: 'auto' }}>
              <Button
                size="small"
                onClick={() => {
                  setEditForm({ name: d.name, costCode: d.costCode ?? '' });
                  setEditing(d);
                }}
              >
                Rename
              </Button>
            </Box>
          </Stack>
        ))}
        {departments.isLoading && <Typography variant="body2">Loading…</Typography>}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          size="small" label="New department" value={draft.name}
          onChange={(e) => setDraft((f) => ({ ...f, name: e.target.value }))}
        />
        <TextField
          size="small" label="Cost code (optional)" value={draft.costCode}
          onChange={(e) => setDraft((f) => ({ ...f, costCode: e.target.value }))}
        />
        <Button
          variant="contained"
          disabled={!draft.name.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          Add
        </Button>
      </Stack>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Rename {editing?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name" value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Cost code" value={editForm.costCode}
              onChange={(e) => setEditForm((f) => ({ ...f, costCode: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!editForm.name.trim() || rename.isPending}
            onClick={() => rename.mutate()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
