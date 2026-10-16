import { Fragment, useState } from 'react';
import {
  Box, Chip, FormControlLabel, Stack, Switch, Table, TableBody, TableContainer, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { formatMinutes } from '../../lib/duration';
import type { ReportRow } from '../../lib/rangeReport';
import { WEEKLY_TARGET_HOURS, mondayOf } from '../../lib/weeklyTarget';
import TargetPercentChip from '../common/TargetPercentChip';
import SalesOrderCell from '../common/SalesOrderCell';

interface ReportEmployeeDetailsProps {
  /** One person's entries within the report range. */
  rows: ReportRow[];
  /** The selected time frame (YYYY-MM-DD, inclusive). */
  from: string;
  to: string;
  /** Whole-week totals in minutes, keyed by the week's Monday (YYYY-MM-DD). */
  weekTotals?: Map<string, number>;
}

/**
 * A person's time across the selected range, day by day: every day from
 * `from` to `to` with its total and the entries behind it. Days with nothing
 * logged are listed too (they can be hidden on long ranges), so the panel
 * reads as the whole time frame rather than just the busy days.
 */
export default function ReportEmployeeDetails({ rows, from, to, weekTotals }: ReportEmployeeDetailsProps) {
  // The report rows are already trimmed to the range; filtering again keeps
  // this panel correct on its own, whatever it is handed.
  const inRange = rows.filter((r) => r.workDate >= from && r.workDate <= to);
  const byDay = new Map<string, ReportRow[]>();
  for (const r of inRange) byDay.set(r.workDate, [...(byDay.get(r.workDate) ?? []), r]);
  const [hideEmpty, setHideEmpty] = useState(false);

  const allDays: string[] = [];
  for (let d = dayjs(from); !d.isAfter(dayjs(to), 'day'); d = d.add(1, 'day')) {
    allDays.push(d.format('YYYY-MM-DD'));
  }
  const loggedDays = allDays.filter((iso) => byDay.has(iso)).length;
  const days = hideEmpty ? allDays.filter((iso) => byDay.has(iso)) : allDays;

  return (
    <Box sx={{ py: 1.5, px: { xs: 0, md: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>{dayjs(from).format('D MMM YYYY')} – {dayjs(to).format('D MMM YYYY')}</strong> ·{' '}
          {allDays.length} {allDays.length === 1 ? 'day' : 'days'}, time logged on {loggedDays}
        </Typography>
        <FormControlLabel
          control={<Switch size="small" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />}
          label={<Typography variant="body2">Hide days with no time</Typography>}
        />
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 130 }}>Day</TableCell>
              <TableCell>Project</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Task</TableCell>
              <TableCell>SO number</TableCell>
              <TableCell>Billable</TableCell>
              <TableCell>Week status</TableCell>
              <TableCell align="right">Hours</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {days.map((iso, idx) => {
              const monday = mondayOf(iso);
              const weekHeader = (idx === 0 || mondayOf(days[idx - 1]) !== monday) && (
                <WeekHeaderRow
                  key={`week-${monday}`}
                  monday={monday}
                  from={from}
                  to={to}
                  minutes={weekTotals?.get(monday) ?? 0}
                />
              );
              const dayRows = byDay.get(iso) ?? [];
              const day = dayjs(iso);
              const isWeekend = day.day() === 0 || day.day() === 6;
              const total = dayRows.reduce((s, r) => s + r.minutes, 0);

              if (dayRows.length === 0) {
                return (
                  <Fragment key={iso}>
                    {weekHeader}
                    <TableRow sx={{ bgcolor: isWeekend ? 'action.hover' : undefined }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>{day.format('ddd D MMM')}</Typography>
                      </TableCell>
                      <TableCell colSpan={6}>
                        <Typography variant="body2" color="text.secondary">No time logged</Typography>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              }

              return (
                <Fragment key={iso}>
                  {weekHeader}
                  {dayRows.map((r, i) => (
                    <TableRow key={`${iso}-${i}`} sx={{ bgcolor: isWeekend ? 'action.hover' : undefined }}>
                      {i === 0 && (
                        <TableCell rowSpan={dayRows.length} sx={{ verticalAlign: 'top' }}>
                          <Stack>
                            <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>{day.format('ddd D MMM')}</Typography>
                            <Typography variant="caption" color="text.secondary">{formatMinutes(total)}</Typography>
                          </Stack>
                        </TableCell>
                      )}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {r.isOtherProject ? (
                          <>
                            <Typography component="span" variant="body2">{r.projectName}</Typography>{' '}
                            <Chip size="small" color="warning" variant="outlined" label="not in list" />
                          </>
                        ) : (
                          <>
                            <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {r.projectCode || '—'}
                            </Typography>{' '}
                            <Typography component="span" variant="body2" color="text.secondary">
                              {r.projectName}
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.description}</Typography>
                        {r.loggedBy && (
                          <Typography variant="caption" color="text.secondary">Logged by {r.loggedBy}</Typography>
                        )}
                      </TableCell>
                      <TableCell><SalesOrderCell number={r.salesOrderNumber} customer={r.customerName} /></TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={r.isBillable ? 'billable' : 'non-billable'}
                          color={r.isBillable ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.status.replace('_', ' ').toLowerCase()}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatMinutes(r.minutes)}</TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/**
 * Banner opening each week in the details: the whole Monday–Sunday week's
 * hours against the weekly target. A week the range only partly covers is
 * still measured in full, and says so.
 */
function WeekHeaderRow({ monday, from, to, minutes }: { monday: string; from: string; to: string; minutes: number }) {
  const start = dayjs(monday);
  const end = start.add(6, 'day');
  const partial = monday < from || end.format('YYYY-MM-DD') > to;
  return (
    <TableRow sx={{ bgcolor: 'action.selected' }}>
      <TableCell colSpan={7} sx={{ py: 0.75 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="body2" fontWeight={600}>
            Week of {start.format('D MMM')} – {end.format('D MMM')}
          </Typography>
          <Typography variant="body2">
            {formatMinutes(minutes)} of {WEEKLY_TARGET_HOURS}h
          </Typography>
          <TargetPercentChip loggedMinutes={minutes} />
          {partial && (
            <Typography variant="caption" color="text.secondary">
              whole week, including days outside the selected range
            </Typography>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
}
