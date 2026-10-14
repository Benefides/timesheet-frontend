import { useState } from 'react';
import { Box, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, apiErrorMessage } from '../lib/api';
import { sumMinutes, toDecimalHours, toMinutes } from '../lib/duration';
import { useMyProjects } from '../lib/hooks';
import { OTHER_PROJECT_ID, projectFields } from '../lib/entryProject';
import WeeklyHoursChart from '../components/timesheet/WeeklyHoursChart';
import type { Coworker, Timesheet } from '../lib/types';
import EmployeeWeekNavigation from '../components/timesheet/EmployeeWeekNavigation';
import EmployeeWeekDaysView from '../components/timesheet/EmployeeWeekDaysView';
import EmployeeDayDetailsPanel from '../components/timesheet/EmployeeDayDetailsPanel';
import SubmitSection from '../components/timesheet/SubmitSection';
import StatusAlerts from '../components/timesheet/StatusAlerts';
import WeeklyTargetCard from '../components/timesheet/WeeklyTargetCard';

const EDITABLE: string[] = ['DRAFT', 'REJECTED', 'SUBMITTED'];

function getMonday(date: Dayjs): Dayjs {
  const day = date.day();
  return day === 0 ? date.subtract(6, 'day') : date.startOf('week').add(1, 'day');
}

export default function TimesheetPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(getMonday(dayjs()));
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const { data: projects = [] } = useMyProjects();

  // Fetch all timesheets for the chart
  const allTimesheets = useQuery<Timesheet[]>({
    queryKey: ['my-timesheets-all'],
    queryFn: async () => (await api.get('/timesheets/mine')).data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const weekStartStr = weekStart.format('YYYY-MM-DD');
  const { data: ts, isLoading } = useQuery<Timesheet>({
    queryKey: ['timesheet', weekStartStr],
    queryFn: async () => (await api.get(`/timesheets/weeks/${weekStartStr}`)).data,
  });

  const editable = ts ? EDITABLE.includes(ts.status) : true;

  // Any change to the week also changes the history chart below it.
  const refreshWeek = () => {
    qc.invalidateQueries({ queryKey: ['timesheet', weekStartStr] });
    qc.invalidateQueries({ queryKey: ['my-timesheets-all'] });
  };
  const [form, setForm] = useState({
    projectId: '',
    customProjectName: '',
    workDate: weekStartStr,
    hours: '',
    minutes: '',
    description: '',
    salesOrderNumber: '',
    coworkerIds: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  // Hours and minutes are entered separately and sent as decimal hours.
  const duration = toDecimalHours(form.hours, form.minutes);

  // Who else was on this project that day. Assignments are effective-dated, so
  // the list depends on the day as well as the project.
  const coworkers = useQuery<Coworker[]>({
    queryKey: ['coworkers', form.projectId, form.workDate],
    queryFn: async () =>
      (await api.get(`/projects/${form.projectId}/coworkers`, { params: { date: form.workDate } }))
        .data,
    enabled: Boolean(form.projectId && form.projectId !== OTHER_PROJECT_ID && form.workDate),
  });

  const addEntry = useMutation({
    mutationFn: async () =>
      (await api.post(`/timesheets/weeks/${weekStartStr}/entries`, {
        // "Other" sends the typed project name instead of a project id.
        ...projectFields(form.projectId, form.customProjectName),
        workDate: form.workDate,
        hours: duration,
        // Billable is decided by the server from the SO number.
        salesOrderNumber: form.salesOrderNumber.trim() || null,
        description: form.description,
        coworkerIds: form.coworkerIds,
      })).data,
    onSuccess: () => {
      setForm((f) => ({
        ...f,
        hours: '',
        minutes: '',
        description: '',
        projectId: '',
        customProjectName: '',
        coworkerIds: [],
      }));
      setError(null);
      refreshWeek();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => api.delete(`/timesheets/entries/${id}`),
    onSuccess: () => refreshWeek(),
  });

  const submit = useMutation({
    mutationFn: async () => api.post(`/timesheets/weeks/${weekStartStr}/submit`),
    onSuccess: () => {
      setError(null);
      refreshWeek();
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  // Either part may be blank — 45 minutes with no hours is a valid entry.
  // The 24 h ceiling matches the server's, so an over-long entry is refused
  // here rather than as a validation error after the round trip.
  const canAdd = Boolean(
    form.projectId &&
      (form.projectId !== OTHER_PROJECT_ID || form.customProjectName.trim()) &&
      duration > 0 && duration <= 24 && form.description.trim(),
  );

  // Weekly target: what is recorded, plus the entry being typed as a preview.
  const weekLoggedMinutes = sumMinutes(ts?.entries ?? []);
  const pendingMinutes = editable && selectedDate && duration > 0 && duration <= 24 ? toMinutes(duration) : 0;

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: { xs: 1, sm: 3 } }}
        >
          <Typography variant="h5">My timesheet</Typography>
          <Box sx={{ minWidth: { sm: 200 } }}>
            <StatusAlerts timesheet={ts} error={error} onErrorClear={() => setError(null)} />
          </Box>
        </Stack>
      </Box>

      <EmployeeWeekNavigation weekStart={weekStart} onWeekChange={(w) => {
        setWeekStart(w);
        setSelectedDate(null);
        // Keep the entry form's date inside the week being viewed — a stale
        // date would file the entry into a different week than the one shown.
        setForm((f) => ({ ...f, workDate: w.format('YYYY-MM-DD'), coworkerIds: [] }));
      }} />

      <WeeklyTargetCard loggedMinutes={weekLoggedMinutes} pendingMinutes={pendingMinutes} />

      <EmployeeWeekDaysView
        weekStart={weekStart}
        timesheet={ts}
        selectedDate={selectedDate}
        onSelectDate={(day) => {
          setSelectedDate(day);
          // The day panel's Add button posts form.workDate; it must always be
          // the day on screen, not whatever the form was initialised with.
          // Assignments are effective-dated, so the colleague list resets too.
          setForm((f) => ({ ...f, workDate: day.format('YYYY-MM-DD'), coworkerIds: [] }));
        }}
        editable={editable}
      />

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12}>
          <EmployeeDayDetailsPanel
            selectedDate={selectedDate}
            timesheet={ts}
            projects={projects}
            coworkers={coworkers.data ?? []}
            coworkersLoading={coworkers.isLoading}
            form={form}
            onFormChange={setForm}
            canAdd={canAdd}
            isPending={addEntry.isPending}
            onAddEntry={() => addEntry.mutate()}
            onRemoveEntry={(id) => removeEntry.mutate(id)}
            editable={editable}
            weekLoggedMinutes={weekLoggedMinutes}
            pendingMinutes={pendingMinutes}
          />
        </Grid>
      </Grid>

      <SubmitSection
        timesheet={ts}
        editable={editable}
        isPending={submit.isPending}
        onSubmit={() => submit.mutate()}
      />

      {/* Weekly chart */}
      {allTimesheets.data && allTimesheets.data.length > 0 && (
        <WeeklyHoursChart weeks={allTimesheets.data} title="Your Weekly Hours" endWeek={weekStart} />
      )}
    </Stack>
  );
}
