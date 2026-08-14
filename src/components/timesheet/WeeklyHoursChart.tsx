import { Paper, Stack, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import type { Timesheet } from '../../lib/types';

interface WeeklyData {
  week: string;
  billable: number;
  nonBillable: number;
}

interface WeeklyHoursChartProps {
  weeks: Timesheet[];
  title?: string;
}

export default function WeeklyHoursChart({ weeks, title = 'Weekly Hours' }: WeeklyHoursChartProps) {
  const data: WeeklyData[] = weeks
    .slice(-8)
    .reverse()
    .map((w) => ({
      week: dayjs(w.weekStart).format('MMM D'),
      billable: Number(w.billableHours),
      nonBillable: Number(w.totalHours) - Number(w.billableHours),
    }));

  const totalBillable = weeks.reduce((sum, w) => sum + Number(w.billableHours), 0);
  const totalNonBillable = weeks.reduce(
    (sum, w) => sum + (Number(w.totalHours) - Number(w.billableHours)),
    0,
  );

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h6">{title}</Typography>

        <Stack direction="row" spacing={4}>
          <Stack>
            <Typography variant="caption" color="text.secondary">
              Total Billable
            </Typography>
            <Typography variant="h6" sx={{ color: '#2196F3' }}>
              {totalBillable.toFixed(1)} h
            </Typography>
          </Stack>
          <Stack>
            <Typography variant="caption" color="text.secondary">
              Total Non-Billable
            </Typography>
            <Typography variant="h6" sx={{ color: '#FF9800' }}>
              {totalNonBillable.toFixed(1)} h
            </Typography>
          </Stack>
          <Stack>
            <Typography variant="caption" color="text.secondary">
              Total Hours
            </Typography>
            <Typography variant="h6">
              {(totalBillable + totalNonBillable).toFixed(1)} h
            </Typography>
          </Stack>
        </Stack>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(1)} h`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4 }}
              />
              <Legend />
              <Bar dataKey="billable" stackId="a" fill="#2196F3" name="Billable" />
              <Bar dataKey="nonBillable" stackId="a" fill="#FF9800" name="Non-Billable" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No data available
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
