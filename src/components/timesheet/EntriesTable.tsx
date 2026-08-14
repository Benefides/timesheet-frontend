import { Fragment, useMemo } from 'react';
import {
  IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import dayjs from 'dayjs';
import type { Timesheet, TimesheetEntry } from '../../lib/types';

interface EntriesTableProps {
  timesheet: Timesheet | undefined;
  days: dayjs.Dayjs[];
  isLoading: boolean;
  editable: boolean;
  onRemoveEntry: (id: string) => void;
}

export default function EntriesTable({
  timesheet,
  days,
  isLoading,
  editable,
  onRemoveEntry,
}: EntriesTableProps) {
  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimesheetEntry[]>();
    for (const e of timesheet?.entries ?? []) {
      const key = dayjs(e.workDate).format('YYYY-MM-DD');
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [timesheet]);

  return (
    <Paper variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Project</TableCell>
            <TableCell align="right">Hours</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Description</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Loading…
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            days.map((d) => {
              const key = d.format('YYYY-MM-DD');
              const dayEntries = entriesByDay.get(key) ?? [];
              const dayTotal = dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);
              return (
                <Fragment key={key}>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 600 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <span>{d.format('dddd, D MMM')}</span>
                        <span>{dayTotal ? `${dayTotal} h` : '—'}</span>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {dayEntries.length ? (
                    dayEntries.map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell>{e.project?.code ?? '—'}</TableCell>
                        <TableCell align="right">{e.hours}</TableCell>
                        <TableCell>{e.isBillable ? 'Billable' : 'Non-billable'}</TableCell>
                        <TableCell>{e.description}</TableCell>
                        <TableCell align="right">
                          {editable && (
                            <IconButton size="small" onClick={() => onRemoveEntry(e.id)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary">
                          No time logged
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}
