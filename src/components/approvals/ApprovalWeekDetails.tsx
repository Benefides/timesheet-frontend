import { Box, Chip, Stack, Table, TableBody, TableContainer, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { TimesheetEntry } from '../../lib/types';
import { formatMinutes, sumMinutes } from '../../lib/duration';
import SalesOrderCell from '../common/SalesOrderCell';

interface ApprovalWeekDetailsProps {
  weekStart: string;
  entries: TimesheetEntry[];
}

/**
 * The week an approver is deciding on, day by day: every day Monday–Sunday with
 * its total, and each task logged that day underneath.
 */
export default function ApprovalWeekDetails({ weekStart, entries }: ApprovalWeekDetailsProps) {
  const monday = dayjs(weekStart.slice(0, 10));
  const days = Array.from({ length: 7 }, (_, i) => monday.add(i, 'day'));

  const byDay = new Map<string, TimesheetEntry[]>();
  for (const e of entries) {
    const key = e.workDate.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }

  return (
    <Box sx={{ py: 1.5, px: { xs: 0, md: 2 } }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 120 }}>Day</TableCell>
              <TableCell>Project</TableCell>
              <TableCell sx={{ minWidth: 200 }}>Task</TableCell>
              <TableCell>SO number</TableCell>
              <TableCell>Billable</TableCell>
              <TableCell align="right">Hours</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {days.map((day) => {
              const dayEntries = byDay.get(day.format('YYYY-MM-DD')) ?? [];
              const isWeekend = day.day() === 0 || day.day() === 6;
              const label = (
                <Stack>
                  <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>{day.format('ddd D MMM')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatMinutes(sumMinutes(dayEntries))}
                  </Typography>
                </Stack>
              );

              if (dayEntries.length === 0) {
                return (
                  <TableRow key={day.toString()} sx={{ bgcolor: isWeekend ? 'action.hover' : undefined }}>
                    <TableCell>{label}</TableCell>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">No time logged</Typography>
                    </TableCell>
                  </TableRow>
                );
              }

              return dayEntries.map((e, i) => (
                <TableRow key={e.id} sx={{ bgcolor: isWeekend ? 'action.hover' : undefined }}>
                  {i === 0 && (
                    <TableCell rowSpan={dayEntries.length} sx={{ verticalAlign: 'top' }}>{label}</TableCell>
                  )}
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {e.project ? (
                      <>
                        <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {e.project.code}
                        </Typography>{' '}
                        <Typography component="span" variant="body2" color="text.secondary">
                          {e.project.name}
                        </Typography>
                      </>
                    ) : (
                      // Typed in, not picked: worth a second look before approving.
                      <>
                        <Typography component="span" variant="body2">
                          {e.customProjectName}
                        </Typography>{' '}
                        <Chip size="small" color="warning" variant="outlined" label="not in list" />
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{e.description}</Typography>
                    {e.createdBy && (
                      <Typography variant="caption" color="text.secondary">
                        Logged by {e.createdBy.displayName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell><SalesOrderCell number={e.salesOrderNumber} customer={e.customerName} /></TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={e.isBillable ? 'billable' : 'non-billable'}
                      color={e.isBillable ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatMinutes(sumMinutes([e]))}</TableCell>
                </TableRow>
              ));
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
