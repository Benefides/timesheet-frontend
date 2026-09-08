import { useMemo, useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api } from '../lib/api';
import { useMe } from '../lib/hooks';
import type { AdminUser, TeamTimesheet, TimesheetEntry } from '../lib/types';
import EmployeeHeader from '../components/admin/EmployeeHeader';
import EmployeeWeeksTable from '../components/admin/EmployeeWeeksTable';
import EntryCorrections from '../components/admin/EntryCorrections';

export default function EmployeeTimesheetsPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const qc = useQueryClient();
  const { data: me } = useMe();

  // Editing another person's timesheet is an administrative act; managers
  // reaching this page keep the read-only view.
  const canEdit = me?.role === 'ADMIN';
  const [editing, setEditing] = useState<TimesheetEntry | null>(null);
  const [deleting, setDeleting] = useState<TimesheetEntry | null>(null);
  // The editor restricts an entry to its own week, so it needs the week the
  // clicked row belongs to.
  const [entryWeekStart, setEntryWeekStart] = useState<Dayjs | null>(null);

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
      <EmployeeWeeksTable
        weeks={weeks.data ?? []}
        isLoading={weeks.isLoading}
        canEdit={canEdit}
        onEditEntry={(entry, week) => {
          setEntryWeekStart(dayjs(week.weekStart));
          setEditing(entry);
        }}
        onDeleteEntry={(entry, week) => {
          setEntryWeekStart(dayjs(week.weekStart));
          setDeleting(entry);
        }}
      />

      <EntryCorrections
        editing={editing}
        deleting={deleting}
        weekStart={entryWeekStart}
        employeeId={employeeId ?? null}
        onClose={() => {
          setEditing(null);
          setDeleting(null);
        }}
        onChanged={() =>
          qc.invalidateQueries({ queryKey: ['employee-timesheets', employeeId] })
        }
      />
    </Stack>
  );
}
