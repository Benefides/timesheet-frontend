import {
  Alert, Button, IconButton, Paper, Stack, Table, TableBody, TableContainer, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Coworker, Project, Timesheet } from '../../lib/types';
import { formatMinutes, sumMinutes, formatHours } from '../../lib/duration';
import ProjectPicker from './ProjectPicker';
import CoworkerPicker from './CoworkerPicker';
import SalesOrderField from './SalesOrderField';
import { OTHER_PROJECT_ID, entryProjectLabel } from '../../lib/entryProject';
import { WEEKLY_TARGET_HOURS, weekProgress } from '../../lib/weeklyTarget';

/** One line under the form: where the week stands once this entry is added. */
function WeekRemainingHint({ loggedMinutes, pendingMinutes }: { loggedMinutes: number; pendingMinutes: number }) {
  const p = weekProgress(loggedMinutes + pendingMinutes);
  const prefix = pendingMinutes > 0 ? 'After this entry' : 'This week';
  return (
    <Typography variant="body2" color={p.remainingMinutes ? 'text.secondary' : 'success.main'}>
      {prefix}: {formatMinutes(p.loggedMinutes)} of {WEEKLY_TARGET_HOURS}h ({p.percent}%) ·{' '}
      {p.remainingMinutes
        ? `${formatMinutes(p.remainingMinutes)} remaining`
        : p.overMinutes ? `${formatMinutes(p.overMinutes)} over target` : 'target met'}
    </Typography>
  );
}

interface FormData {
  /** A project id, OTHER_PROJECT_ID, or '' when nothing is chosen. */
  projectId: string;
  /** The project name typed when "Other" is chosen. */
  customProjectName: string;
  workDate: string;
  hours: string;
  minutes: string;
  description: string;
  /** Sales order number; filled in means billable, blank means non-billable. */
  salesOrderNumber: string;
  /** Colleagues who worked the same block of time. */
  coworkerIds: string[];
}

interface EmployeeDayDetailsPanelProps {
  selectedDate: Dayjs | null;
  timesheet: Timesheet | undefined;
  projects: Project[];
  /** Colleagues on the chosen project that day. */
  coworkers: Coworker[];
  coworkersLoading: boolean;
  form: FormData;
  onFormChange: (form: FormData) => void;
  canAdd: boolean;
  isPending: boolean;
  onAddEntry: () => void;
  onRemoveEntry: (id: string) => void;
  editable: boolean;
  /** Time already recorded this week, for the weekly-target preview. */
  weekLoggedMinutes: number;
  /** The duration being typed. */
  pendingMinutes: number;
}

export default function EmployeeDayDetailsPanel({
  selectedDate,
  timesheet,
  projects,
  coworkers,
  coworkersLoading,
  form,
  onFormChange,
  canAdd,
  isPending,
  onAddEntry,
  onRemoveEntry,
  editable,
  weekLoggedMinutes,
  pendingMinutes,
}: EmployeeDayDetailsPanelProps) {
  const isOther = form.projectId === OTHER_PROJECT_ID;

  if (!selectedDate) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          Select a day to view or add entries
        </Typography>
      </Paper>
    );
  }

  const dayEntries = timesheet?.entries.filter((e) =>
    dayjs(e.workDate).isSame(selectedDate, 'day'),
  ) ?? [];
  const dayTotal = sumMinutes(dayEntries);
  const billableTotal = sumMinutes(dayEntries.filter((e) => e.isBillable));

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {selectedDate.format('dddd, D MMMM YYYY')}
        </Typography>
        <Stack direction="row" spacing={2}>
          <div>
            <Typography variant="caption" color="text.secondary">
              Total time
            </Typography>
            <Typography variant="h6">{dayTotal ? formatMinutes(dayTotal) : '—'}</Typography>
          </div>
          <div>
            <Typography variant="caption" color="text.secondary">
              Billable
            </Typography>
            <Typography variant="h6">
              {billableTotal ? formatMinutes(billableTotal) : '—'}
            </Typography>
          </div>
        </Stack>
      </Paper>

      {/* Entries for this day */}
      {dayEntries.length ? (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Project</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Description</TableCell>
                  <TableCell>SO number</TableCell>
                  <TableCell align="right">Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {dayEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{entryProjectLabel(e)}</TableCell>
                    <TableCell>
                      {e.description}
                      {e.createdBy && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Added by {e.createdBy.displayName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{e.salesOrderNumber || '—'}</TableCell>
                    <TableCell align="right">{formatHours(e.hours)}</TableCell>
                    <TableCell>{e.isBillable ? 'Billable' : 'Non-billable'}</TableCell>
                    <TableCell align="right">
                      {editable && (
                        <IconButton size="small" onClick={() => onRemoveEntry(e.id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography color="text.secondary" variant="body2">
            No entries for this day.
          </Typography>
        </Paper>
      )}

      {/* Add entry form */}
      {editable && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Add time entry
          </Typography>
          {projects.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You have no assigned projects yet. Choose “Other (not in list)” to log time against a
              project by name until an administrator assigns you.
            </Alert>
          )}
          <Stack spacing={2}>
            <ProjectPicker
              projects={projects}
              value={form.projectId}
              size="small"
              onChange={(p) =>
                onFormChange({
                  ...form,
                  projectId: p?.id ?? '',
                  // The colleague list is per project — a stale pick would
                  // name someone who is not on the new project.
                  coworkerIds: [],
                })
              }
            />
            {isOther && (
              <TextField
                label="Project name"
                size="small"
                required
                autoFocus
                value={form.customProjectName}
                inputProps={{ maxLength: 160 }}
                helperText="For a project that isn't in the list yet. An admin can move this entry onto the project once it's set up."
                onChange={(e) => onFormChange({ ...form, customProjectName: e.target.value })}
              />
            )}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Hours"
                type="number"
                size="small"
                sx={{ flex: 1 }}
                value={form.hours}
                inputProps={{ min: 0, max: 24, step: 1 }}
                onChange={(e) => onFormChange({ ...form, hours: e.target.value })}
              />
              <TextField
                label="Minutes"
                type="number"
                size="small"
                sx={{ flex: 1 }}
                value={form.minutes}
                inputProps={{ min: 0, max: 59, step: 5 }}
                onChange={(e) => onFormChange({ ...form, minutes: e.target.value })}
              />
            </Stack>
            <TextField
              label="Description"
              size="small"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            />
            <SalesOrderField
              value={form.salesOrderNumber}
              onChange={(salesOrderNumber) => onFormChange({ ...form, salesOrderNumber })}
            />
            {/* Sharing checks each colleague's assignment, which an unlisted project doesn't have. */}
            {!isOther && (
              <CoworkerPicker
                coworkers={coworkers}
                value={form.coworkerIds}
                size="small"
                disabled={!form.projectId}
                isLoading={coworkersLoading}
                onChange={(ids) => onFormChange({ ...form, coworkerIds: ids })}
              />
            )}
            <WeekRemainingHint loggedMinutes={weekLoggedMinutes} pendingMinutes={pendingMinutes} />
            <Button
              variant="contained"
              disabled={!canAdd || isPending}
              onClick={onAddEntry}
            >
              Add entry
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
