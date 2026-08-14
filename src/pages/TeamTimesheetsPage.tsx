import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TeamTimesheet, TimesheetStatus } from '../lib/types';
import TeamTimesheetsTable from '../components/team/TeamTimesheetsTable';
import StatusFilter from '../components/team/StatusFilter';

type Status = TimesheetStatus | 'ALL';

export default function TeamTimesheetsPage() {
  const [status, setStatus] = useState<Status>('ALL');

  const { data: sheets = [], isLoading } = useQuery<TeamTimesheet[]>({
    queryKey: ['team-timesheets', status],
    queryFn: async () =>
      (await api.get('/timesheets', { params: status === 'ALL' ? {} : { status } })).data,
  });

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
        <Box>
          <Typography variant="h5">Team timesheets</Typography>
          <Typography color="text.secondary">
            Every week your team has recorded, whatever its state.
          </Typography>
        </Box>
        <StatusFilter value={status} onChange={setStatus} />
      </Stack>

      <TeamTimesheetsTable items={sheets} isLoading={isLoading} />
    </Stack>
  );
}
