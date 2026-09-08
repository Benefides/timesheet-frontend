import { useEffect, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  MenuItem, Stack, Switch, TextField,
} from '@mui/material';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Project, TimesheetEntry } from '../../lib/types';
import { splitDuration, toDecimalHours } from '../../lib/duration';
import ProjectPicker from '../timesheet/ProjectPicker';

export interface EntryPatch {
  projectId: string;
  workDate: string;
  hours: number;
  isBillable: boolean;
  description: string;
}

interface EntryEditDialogProps {
  /** The entry being corrected; null closes the dialog. */
  entry: TimesheetEntry | null;
  /** The seven days of the entry's week — an entry cannot move outside it. */
  days: Dayjs[];
  /** Projects the ENTRY'S OWNER may book to, not the admin's own. */
  projects: Project[];
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (patch: EntryPatch) => void;
}

/**
 * Administrative correction of a single entry. Every field an entry is created
 * with can be changed, including the day, so a misfiled entry is fixed in place
 * rather than deleted and retyped.
 */
export default function EntryEditDialog({
  entry,
  days,
  projects,
  isPending,
  error,
  onClose,
  onSave,
}: EntryEditDialogProps) {
  const [form, setForm] = useState({
    projectId: '',
    workDate: '',
    hours: '',
    minutes: '',
    isBillable: true,
    description: '',
  });

  // Reload the form whenever a different entry is opened — the dialog is a
  // single instance reused for every row.
  useEffect(() => {
    if (!entry) return;
    const { hours, minutes } = splitDuration(entry.hours);
    setForm({
      projectId: entry.projectId,
      workDate: dayjs(entry.workDate).format('YYYY-MM-DD'),
      hours: String(hours),
      minutes: String(minutes),
      isBillable: entry.isBillable,
      description: entry.description,
    });
  }, [entry]);

  const duration = toDecimalHours(form.hours, form.minutes);
  const canSave = Boolean(
    form.projectId && form.workDate && duration > 0 && duration <= 24 && form.description.trim(),
  );

  return (
    <Dialog open={Boolean(entry)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit time entry</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <ProjectPicker
            projects={projects}
            value={form.projectId}
            size="small"
            onChange={(p) =>
              setForm((f) => ({
                ...f,
                projectId: p?.id ?? '',
                isBillable: p?.isBillable ?? f.isBillable,
              }))
            }
          />

          <TextField
            select
            label="Day"
            size="small"
            value={form.workDate}
            onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))}
          >
            {days.map((d) => (
              <MenuItem key={d.format('YYYY-MM-DD')} value={d.format('YYYY-MM-DD')}>
                {d.format('dddd, D MMM')}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Hours"
              type="number"
              size="small"
              sx={{ flex: 1 }}
              value={form.hours}
              inputProps={{ min: 0, max: 24, step: 1 }}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
            />
            <TextField
              label="Minutes"
              type="number"
              size="small"
              sx={{ flex: 1 }}
              value={form.minutes}
              inputProps={{ min: 0, max: 59, step: 5 }}
              onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
            />
          </Stack>

          <TextField
            label="Description"
            size="small"
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.isBillable}
                onChange={(e) => setForm((f) => ({ ...f, isBillable: e.target.checked }))}
              />
            }
            label="Billable"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canSave || isPending}
          onClick={() =>
            onSave({
              projectId: form.projectId,
              workDate: form.workDate,
              hours: duration,
              isBillable: form.isBillable,
              description: form.description.trim(),
            })
          }
        >
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
