import { useState } from 'react';
import { Box, CircularProgress, Grid, Stack } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, apiErrorMessage } from '../lib/api';
import { useMyProjects } from '../lib/hooks';
import WeeklyHoursChart from '../components/timesheet/WeeklyHoursChart';
import type { Timesheet } from '../lib/types';
import EmployeeWeekNavigation from '../components/timesheet/EmployeeWeekNavigation';
import EmployeeWeekDaysView from '../components/timesheet/EmployeeWeekDaysView';
import EmployeeDayDetailsPanel from '../components/timesheet/EmployeeDayDetailsPanel';
import SubmitSection from '../components/timesheet/SubmitSection';
import StatusAlerts from '../components/timesheet/StatusAlerts';

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
    queryFn: async () => (await api.get('/timesheets')).data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const weekStartStr = weekStart.format('YYYY-MM-DD');
  const { data: ts, isLoading } = useQuery<Timesheet>({
    queryKey: ['timesheet', weekStartStr],
    queryFn: async () => (await api.get(`/timesheets/weeks/${weekStartStr}`)).data,
  });

  const editable = ts ? EDITABLE.includes(ts.status) : true;
  const [form, setForm] = useState({
    projectId: '',
    workDate: weekStartStr,
    hours: '',
    description: '',
    isBillable: true,
  });
  const [error, setError] = useState<string | null>(null);

  const addEntry = useMutation({
    mutationFn: async () =>
      (await api.post(`/timesheets/weeks/${weekStartStr}/entries`, {
        projectId: form.projectId,
        workDate: form.workDate,
        hours: Number(form.hours),
        isBillable: form.isBillable,
        description: form.description,
      })).data,
    onSuccess: () => {
      setForm((f) => ({ ...f, hours: '', description: '', projectId: '' }));
      setError(null);
      qc.invalidateQueries({ queryKey: ['timesheet', weekStartStr] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => api.delete(`/timesheets/entries/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet', weekStartStr] }),
  });

  const submit = useMutation({
    mutationFn: async () => api.post(`/timesheets/weeks/${weekStartStr}/submit`),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ['timesheet', weekStartStr] });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  const canAdd = Boolean(
    form.projectId && form.hours && Number(form.hours) > 0 && form.description.trim(),
  );

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
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Stack>
            <h2 style={{ margin: 0 }}>My timesheet</h2>
          </Stack>
          <Box sx={{ minWidth: 200 }}>
            <StatusAlerts timesheet={ts} error={error} onErrorClear={() => setError(null)} />
          </Box>
        </Stack>
      </Box>

      <EmployeeWeekNavigation weekStart={weekStart} onWeekChange={(w) => {
        setWeekStart(w);
        setSelectedDate(null);
      }} />

      <EmployeeWeekDaysView
        weekStart={weekStart}
        timesheet={ts}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        editable={editable}
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <EmployeeDayDetailsPanel
            selectedDate={selectedDate}
            timesheet={ts}
            projects={projects}
            form={form}
            onFormChange={setForm}
            canAdd={canAdd}
            isPending={addEntry.isPending}
            onAddEntry={() => addEntry.mutate()}
            onRemoveEntry={(id) => removeEntry.mutate(id)}
            editable={editable}
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
        <WeeklyHoursChart weeks={allTimesheets.data} title="Your Weekly Hours" />
      )}
    </Stack>
  );
}
