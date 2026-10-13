import { Paper, Stack, Typography } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import type { Timesheet } from '../../lib/types';
import { formatMinutes, toMinutes } from '../../lib/duration';
import { WEEKLY_TARGET_HOURS } from '../../lib/weeklyTarget';

interface WeeklyData {
  key: string;
  week: string;
  billable: number;
  nonBillable: number;
}

interface WeeklyHoursChartProps {
  weeks: Timesheet[];
  title?: string;
  /**
   * Monday of the week the page is showing. The chart covers the weeks up to
   * and including it, so it moves with the week navigation.
   */
  endWeek?: Dayjs;
  /** How many consecutive weeks to show. */
  span?: number;
}

const BILLABLE = '#2196F3';
const NON_BILLABLE = '#FF9800';

export default function WeeklyHoursChart({
  weeks,
  title = 'Weekly Hours',
  endWeek,
  span = 8,
}: WeeklyHoursChartProps) {
  // Weeks arrive newest first and only exist once time was logged, so index
  // them by Monday and lay out a continuous window — empty weeks show as 0
  // rather than silently dropping out of the axis.
  const byMonday = new Map<string, Timesheet>();
  for (const w of weeks) byMonday.set(w.weekStart.slice(0, 10), w);

  // Fall back to this week's Monday (Sunday belongs to the week before).
  const today = dayjs();
  const last = endWeek ?? today.subtract((today.day() + 6) % 7, 'day').startOf('day');
  const endKey = last.format('YYYY-MM-DD');
  const mondays = Array.from({ length: span }, (_, i) => last.subtract(span - 1 - i, 'week'));

  let billableMin = 0;
  let nonBillableMin = 0;
  const data: WeeklyData[] = mondays.map((monday) => {
    const key = monday.format('YYYY-MM-DD');
    const w = byMonday.get(key);
    const total = toMinutes(w?.totalHours);
    const billable = toMinutes(w?.billableHours);
    billableMin += billable;
    nonBillableMin += total - billable;
    return {
      key,
      week: monday.format('MMM D'),
      billable: billable / 60,
      nonBillable: (total - billable) / 60,
    };
  });

  const peak = Math.max(...data.map((d) => d.billable + d.nonBillable), 0);
  const rangeLabel = `${mondays[0].format('D MMM')} – ${mondays[span - 1].add(6, 'day').format('D MMM YYYY')}`;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Stack>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="caption" color="text.secondary">
            Last {span} weeks · {rangeLabel}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={4}>
          <Stack>
            <Typography variant="caption" color="text.secondary">Billable</Typography>
            <Typography variant="h6" sx={{ color: BILLABLE }}>{formatMinutes(billableMin)}</Typography>
          </Stack>
          <Stack>
            <Typography variant="caption" color="text.secondary">Non-billable</Typography>
            <Typography variant="h6" sx={{ color: NON_BILLABLE }}>{formatMinutes(nonBillableMin)}</Typography>
          </Stack>
          <Stack>
            <Typography variant="caption" color="text.secondary">Total</Typography>
            <Typography variant="h6">{formatMinutes(billableMin + nonBillableMin)}</Typography>
          </Stack>
        </Stack>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            {/* Always tall enough to show the target line. */}
            <YAxis domain={[0, Math.ceil(Math.max(peak, WEEKLY_TARGET_HOURS) / 5) * 5]} />
            <Tooltip
              formatter={(value) => formatMinutes(Math.round(Number(value) * 60))}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4 }}
            />
            <Legend />
            <ReferenceLine
              y={WEEKLY_TARGET_HOURS}
              stroke="#9e9e9e"
              strokeDasharray="6 4"
              label={{ value: `Target ${WEEKLY_TARGET_HOURS}h`, position: 'insideTopRight', fontSize: 12 }}
            />
            {/* The week on screen is drawn solid; the others are muted. */}
            <Bar dataKey="billable" stackId="a" fill={BILLABLE} name="Billable">
              {data.map((d) => <Cell key={d.key} fillOpacity={d.key === endKey ? 1 : 0.55} />)}
            </Bar>
            <Bar dataKey="nonBillable" stackId="a" fill={NON_BILLABLE} name="Non-Billable">
              {data.map((d) => <Cell key={d.key} fillOpacity={d.key === endKey ? 1 : 0.55} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Stack>
    </Paper>
  );
}
