import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { formatMinutes } from '../../lib/duration';
import type { ReportRow } from '../../lib/rangeReport';

interface ReportEmployeeDetailsProps {
  /** One person's entries within the report range. */
  rows: ReportRow[];
}

/**
 * A person's time in the report range, day by day: each day they logged time,
 * its total, and every entry behind it. Days with nothing logged are left out
 * so a long range stays readable.
 */
export default function ReportEmployeeDetails({ rows }: ReportEmployeeDetailsProps) {
  const byDay = new Map<string, ReportRow[]>();
  for (const r of rows) byDay.set(r.workDate, [...(byDay.get(r.workDate) ?? []), r]);
  const days = [...byDay.keys()].sort();

  return (
    <Box sx={{ py: 1.5, px: { xs: 0, md: 2 } }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 130 }}>Day</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>Task</TableCell>
            <TableCell>SO number</TableCell>
            <TableCell>Billable</TableCell>
            <TableCell>Week status</TableCell>
            <TableCell align="right">Hours</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {days.map((iso) => {
            const dayRows = byDay.get(iso)!;
            const day = dayjs(iso);
            const isWeekend = day.day() === 0 || day.day() === 6;
            const total = dayRows.reduce((s, r) => s + r.minutes, 0);

            return dayRows.map((r, i) => (
              <TableRow key={`${iso}-${i}`} sx={{ bgcolor: isWeekend ? 'action.hover' : undefined }}>
                {i === 0 && (
                  <TableCell rowSpan={dayRows.length} sx={{ verticalAlign: 'top' }}>
                    <Stack>
                      <Typography variant="body2" fontWeight={600}>{day.format('ddd D MMM')}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatMinutes(total)}</Typography>
                    </Stack>
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {r.projectCode || '—'}
                  </Typography>{' '}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {r.projectName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.description}</Typography>
                  {r.loggedBy && (
                    <Typography variant="caption" color="text.secondary">Logged by {r.loggedBy}</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.salesOrderNumber || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={r.isBillable ? 'billable' : 'non-billable'}
                    color={r.isBillable ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.status.replace('_', ' ').toLowerCase()}</TableCell>
                <TableCell align="right">{formatMinutes(r.minutes)}</TableCell>
              </TableRow>
            ));
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
