import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, apiErrorMessage } from '../lib/api';
import { formatMinutes } from '../lib/duration';
import { buildRangeReport, downloadRangeReportXlsx } from '../lib/rangeReport';
import type { AdminUser, TeamTimesheet, TimesheetStatus } from '../lib/types';
import StatusFilter from '../components/team/StatusFilter';

type Status = TimesheetStatus | 'ALL';

const ISO = 'YYYY-MM-DD';

export default function ReportsPage() {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [employeeId, setEmployeeId] = useState<string>('ALL');
  const [status, setStatus] = useState<Status>('ALL');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fromIso = from?.isValid() ? from.format(ISO) : null;
  const toIso = to?.isValid() ? to.format(ISO) : null;
  const rangeError = fromIso && toIso && fromIso > toIso ? '“From” must be on or before “To”' : null;
  const canQuery = !!fromIso && !!toIso && !rangeError;

  // Managers get their direct reports; admins get everyone.
  const employees = useQuery<AdminUser[]>({
    queryKey: ['team-roster'],
    queryFn: async () => (await api.get('/users/team')).data,
  });

  const weeks = useQuery<TeamTimesheet[]>({
    queryKey: ['range-report', fromIso, toIso, employeeId],
    queryFn: async () =>
      (await api.get('/timesheets', {
        params: { from: fromIso, to: toIso, ...(employeeId === 'ALL' ? {} : { userId: employeeId }) },
      })).data,
    enabled: canQuery,
  });

  // Status is filtered here rather than by the API, which doesn't accept every status.
  const report = useMemo(() => {
    if (!canQuery || !weeks.data) return null;
    const filtered = status === 'ALL' ? weeks.data : weeks.data.filter((w) => w.status === status);
    return buildRangeReport(filtered, fromIso!, toIso!);
  }, [canQuery, weeks.data, status, fromIso, toIso]);

  const onExport = async () => {
    if (!report) return;
    setExporting(true);
    setExportError(null);
    try {
      await downloadRangeReportXlsx(report);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Time range report</Typography>
        <Typography color="text.secondary">
          Hours logged between two dates. The Excel download has a day-wise tab for each person and a
          final consolidated tab.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <DatePicker
            label="From" value={from} onChange={setFrom} maxDate={to ?? undefined}
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="To" value={to} onChange={setTo} minDate={from ?? undefined}
            slotProps={{ textField: { size: 'small', error: !!rangeError, helperText: rangeError } }}
          />
          <TextField
            select size="small" label="Employee" value={employeeId} sx={{ minWidth: 220 }}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <MenuItem value="ALL">All employees</MenuItem>
            {(employees.data ?? []).map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.displayName}</MenuItem>
            ))}
          </TextField>
          <StatusFilter value={status} onChange={setStatus} />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={!report || report.rows.length === 0 || exporting}
            onClick={onExport}
          >
            Download .xlsx
          </Button>
        </Stack>
      </Paper>

      {weeks.isError && <Alert severity="error">{apiErrorMessage(weeks.error)}</Alert>}
      {exportError && <Alert severity="error">{exportError}</Alert>}

      {weeks.isLoading && canQuery && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>
      )}

      {report && (
        report.rows.length === 0 ? (
          <Alert severity="info">No time was logged in this range.</Alert>
        ) : (
          <Paper variant="outlined">
            <Stack direction="row" spacing={4} sx={{ p: 2 }}>
              <Typography variant="body2">
                <strong>{formatMinutes(report.totalMinutes)}</strong> total
              </Typography>
              <Typography variant="body2">
                <strong>{formatMinutes(report.billableMinutes)}</strong> billable
              </Typography>
              <Typography variant="body2">
                <strong>{report.rows.length}</strong> entries
              </Typography>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Billable</TableCell>
                  <TableCell align="right">Non-billable</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.byEmployee.map((e) => (
                  <TableRow key={e.userId}>
                    <TableCell>{e.employee}</TableCell>
                    <TableCell>{e.employeeCode || '—'}</TableCell>
                    <TableCell align="right">{formatMinutes(e.minutes)}</TableCell>
                    <TableCell align="right">{formatMinutes(e.billableMinutes)}</TableCell>
                    <TableCell align="right">{formatMinutes(e.minutes - e.billableMinutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )
      )}
    </Stack>
  );
}
