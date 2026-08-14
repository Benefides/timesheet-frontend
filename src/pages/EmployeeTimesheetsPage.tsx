import { useMemo } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AdminUser, TeamTimesheet } from '../lib/types';
import EmployeeHeader from '../components/admin/EmployeeHeader';
import EmployeeWeeksTable from '../components/admin/EmployeeWeeksTable';

export default function EmployeeTimesheetsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();

  const employees = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const employee = useMemo(
    () => employees.data?.find((u) => u.id === employeeId),
    [employees.data, employeeId],
  );

  const weeks = useQuery<TeamTimesheet[]>({
    queryKey: ['employee-timesheets', employeeId],
    queryFn: async () =>
      (await api.get('/timesheets', { params: { userId: employeeId } })).data,
    enabled: !!employeeId,
  });

  if (employees.isLoading || !employee) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <EmployeeHeader employee={employee} />
      <EmployeeWeeksTable weeks={weeks.data ?? []} isLoading={weeks.isLoading} />
    </Stack>
  );
}
