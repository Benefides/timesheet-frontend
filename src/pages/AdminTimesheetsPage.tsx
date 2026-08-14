import { useMemo, useState } from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api } from '../lib/api';
import type { AdminUser, TeamTimesheet } from '../lib/types';
import EmployeesList from '../components/admin/EmployeesList';
import WeekNavigationAdmin from '../components/admin/WeekNavigationAdmin';
import WeekDaysView from '../components/admin/WeekDaysView';
import DayDetailsPanel from '../components/admin/DayDetailsPanel';
import WeeklyHoursChart from '../components/timesheet/WeeklyHoursChart';

function getMonday(date: Dayjs): Dayjs {
  const day = date.day();
  return day === 0 ? date.subtract(6, 'day') : date.startOf('week').add(1, 'day');
}

export default function AdminTimesheetsPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(getMonday(dayjs()));
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  // Managers get their direct reports; admins get everyone.
  const employees = useQuery<AdminUser[]>({
    queryKey: ['team-roster'],
    queryFn: async () => (await api.get('/users/team')).data,
  });

  const weeks = useQuery<TeamTimesheet[]>({
    queryKey: ['employee-timesheets', selectedEmployeeId],
    queryFn: async () =>
      (await api.get('/timesheets', { params: { userId: selectedEmployeeId } })).data,
    enabled: !!selectedEmployeeId,
  });

  const selectedEmployee = useMemo(
    () => employees.data?.find((u) => u.id === selectedEmployeeId),
    [employees.data, selectedEmployeeId],
  );

  // Auto-select first employee
  useMemo(() => {
    if (!selectedEmployeeId && employees.data?.length) {
      setSelectedEmployeeId(employees.data[0].id);
    }
  }, [employees.data, selectedEmployeeId]);

  return (
    <Stack spacing={3}>
      {/* Header with employee name and status */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5">Timesheets</Typography>
        {selectedEmployee && (
          <Stack alignItems="flex-end">
            <Typography variant="subtitle1">{selectedEmployee.displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedEmployee.email}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* Week Navigation */}
      <WeekNavigationAdmin weekStart={weekStart} onWeekChange={setWeekStart} />

      <Grid container spacing={3}>
        {/* Left: Employees List */}
        <Grid item xs={12} md={3}>
          <EmployeesList
            employees={employees.data ?? []}
            selectedId={selectedEmployeeId}
            onSelect={(id) => {
              setSelectedEmployeeId(id);
              setSelectedDate(null);
            }}
            isLoading={employees.isLoading}
          />
        </Grid>

        {/* Right: Week Days + Day Details */}
        <Grid item xs={12} md={9}>
          <Stack spacing={3}>
            {selectedEmployeeId && (
              <>
                <WeekDaysView
                  weekStart={weekStart}
                  weeks={weeks.data ?? []}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />

                <DayDetailsPanel selectedDate={selectedDate} weeks={weeks.data ?? []} />

            {weeks.data && weeks.data.length > 0 && (
              <WeeklyHoursChart weeks={weeks.data} title="Employee Weekly Hours" />
            )}
              </>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
