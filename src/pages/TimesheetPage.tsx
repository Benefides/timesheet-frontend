import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, IconButton, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api, apiErrorMessage } from '../lib/api';
import { useMyProjects } from '../lib/hooks';
import type { Timesheet, TimesheetStatus } from '../lib/types';

// Monday of the current (or offset) ISO week.
function mondayOf(offsetWeeks = 0): string {
  const d = dayjs().add(offsetWeeks, 'week');
  const monday = d.day() === 0 ? d.subtract(6, 'day') : d.startOf('week').add(1, 'day');
  return monday.format('YYYY-MM-DD');
}

const STATUS_COLOR: Record<TimesheetStatus, 'default' | 'info' | 'success' | 'warning'> = {
  DRAFT: 'default', SUBMITTED: 'info', APPROVED: 'success', REJECTED: 'warning',
};

const EDITABLE: TimesheetStatus[] = ['DRAFT', 'REJECTED'];

export default function TimesheetPage() {
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const weekStart = useMemo(() => mondayOf(offset), [offset]);
  const { data: projects = [] } = useMyProjects();

  const { data: ts, isLoading } = useQuery<Timesheet>({
    queryKey: ['timesheet', weekStart],
    queryFn: async () => (await api.get(`/timesheets/weeks/${weekStart}`)).data,
  });

  const editable = ts ? EDITABLE.includes(ts.status) : true;
  const days = Array.from({ length: 7 }, (_, i) => dayjs(weekStart).add(i, 'day'));

  // --- new entry form ---
  const [form, setForm] = useState({
    projectId: '', workDate: weekStart, hours: '', description: '', isBillable: true,
  });
  const [error, setError] = useState<string | null>(null);

  const addEntry = useMutation({
    mutationFn: async () =>
      (await api.post(`/timesheets/weeks/${weekStart}/entries`, {
        projectId: form.projectId,
        workDate: form.workDate,
        hours: Number(form.hours),
        isBillable: form.isBillable,
        description: form.description,
      })).data,
    onSuccess: () => {
      setForm((f) => ({ ...f, hours: '', description: '' }));
      setError(null);
      qc.invalidateQueries({ queryKey: ['timesheet', weekStart] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => api.delete(`/timesheets/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet', weekStart] }),
  });

  const submit = useMutation({
    mutationFn: async () => api.post(`/timesheets/weeks/${weekStart}/submit`),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['timesheet', weekStart] }); },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const canAdd = form.projectId && form.hours && Number(form.hours) > 0 && form.description.trim();

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h5">My timesheet</Typography>
          <Typography color="text.secondary">
            Week of {dayjs(weekStart).format('D MMM YYYY')}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => setOffset((o) => o - 1)}><ChevronLeftIcon /></IconButton>
          <Button size="small" onClick={() => setOffset(0)} disabled={offset === 0}>This week</Button>
          <IconButton onClick={() => setOffset((o) => o + 1)}><ChevronRightIcon /></IconButton>
        </Stack>
      </Stack>

      {ts && (
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip label={ts.status} color={STATUS_COLOR[ts.status]} />
          <Typography variant="body2" color="text.secondary">
            {ts.totalHours} h total · {ts.billableHours} h billable
          </Typography>
        </Stack>
      )}

      {ts?.status === 'REJECTED' && (
        <Alert severity="warning">This week was rejected. Adjust the entries and submit again.</Alert>
      )}
      {ts?.status === 'APPROVED' && (
        <Alert severity="success">Approved and locked. Approved time can't be edited.</Alert>
      )}
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Entries */}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Project</TableCell>
              <TableCell align="right">Hours</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {ts?.entries.length ? (
              ts.entries.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{dayjs(e.workDate).format('ddd D')}</TableCell>
                  <TableCell>{e.project?.code ?? '—'}</TableCell>
                  <TableCell align="right">{e.hours}</TableCell>
                  <TableCell>{e.isBillable ? 'Billable' : 'Non-billable'}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell align="right">
                    {editable && (
                      <IconButton size="small" onClick={() => removeEntry.mutate(e.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    {isLoading ? 'Loading…' : 'No time recorded yet. Add your first entry below.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Add entry */}
      {editable && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Add time</Typography>
            {projects.length === 0 ? (
              <Alert severity="info">
                You have no assigned projects yet. An administrator needs to assign you before you can record time.
              </Alert>
            ) : (
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                <TextField
                  select label="Project" sx={{ minWidth: 160 }} value={form.projectId}
                  onChange={(e) => {
                    const p = projects.find((x) => x.id === e.target.value);
                    setForm((f) => ({ ...f, projectId: e.target.value, isBillable: p?.isBillable ?? true }));
                  }}
                >
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.code}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select label="Day" sx={{ minWidth: 130 }} value={form.workDate}
                  onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))}
                >
                  {days.map((d) => (
                    <MenuItem key={d.format('YYYY-MM-DD')} value={d.format('YYYY-MM-DD')}>
                      {d.format('ddd D')}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Hours" type="number" sx={{ width: 100 }} value={form.hours}
                  inputProps={{ min: 0, max: 24, step: 0.25 }}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                />
                <TextField
                  label="Description" fullWidth value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <Button
                  variant="contained" sx={{ height: 56, px: 3 }}
                  disabled={!canAdd || addEntry.isPending}
                  onClick={() => addEntry.mutate()}
                >
                  Add
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {editable && (ts?.entries.length ?? 0) > 0 && (
        <Box>
          <Button
            variant="contained" size="large" color="primary"
            disabled={submit.isPending} onClick={() => submit.mutate()}
          >
            Submit week for approval
          </Button>
        </Box>
      )}
    </Stack>
  );
}
