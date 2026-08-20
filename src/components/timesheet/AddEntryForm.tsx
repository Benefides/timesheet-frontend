import { Alert, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { Project } from '../../lib/types';
import ProjectPicker from './ProjectPicker';

interface AddEntryFormState {
  projectId: string;
  workDate: string;
  hours: string;
  description: string;
  isBillable: boolean;
}

interface AddEntryFormProps {
  form: AddEntryFormState;
  onFormChange: (form: AddEntryFormState) => void;
  projects: Project[];
  days: dayjs.Dayjs[];
  canAdd: boolean;
  isPending: boolean;
  onSubmit: () => void;
}

export default function AddEntryForm({
  form,
  onFormChange,
  projects,
  days,
  canAdd,
  isPending,
  onSubmit,
}: AddEntryFormProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Add time
        </Typography>
        {projects.length === 0 ? (
          <Alert severity="info">
            You have no assigned projects yet. An administrator needs to assign you before you can
            record time.
          </Alert>
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
            <ProjectPicker
              projects={projects}
              value={form.projectId}
              sx={{ minWidth: 240 }}
              onChange={(p) =>
                onFormChange({ ...form, projectId: p?.id ?? '', isBillable: p?.isBillable ?? true })
              }
            />
            <TextField
              select
              label="Day"
              sx={{ minWidth: 130 }}
              value={form.workDate}
              onChange={(e) => onFormChange({ ...form, workDate: e.target.value })}
            >
              {days.map((d) => (
                <MenuItem key={d.format('YYYY-MM-DD')} value={d.format('YYYY-MM-DD')}>
                  {d.format('ddd D')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Hours"
              type="number"
              sx={{ width: 100 }}
              value={form.hours}
              inputProps={{ min: 0, max: 24, step: 0.25 }}
              onChange={(e) => onFormChange({ ...form, hours: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            />
            <Button
              variant="contained"
              sx={{ height: 56, px: 3 }}
              disabled={!canAdd || isPending}
              onClick={onSubmit}
            >
              Add
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
