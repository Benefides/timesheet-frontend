import { Fragment, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Collapse, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableContainer,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { api, apiErrorMessage } from '../lib/api';
import { formatMinutes, toMinutes } from '../lib/duration';
import { rangeTargetMinutes, weekdaysBetween } from '../lib/weeklyTarget';
import TargetPercentChip from '../components/common/TargetPercentChip';
import { buildRangeReport, downloadRangeReportXlsx } from '../lib/rangeReport';
import type { AdminUser, TeamTimesheet, TimesheetStatus } from '../lib/types';
import StatusFilter from '../components/team/StatusFilter';
import ReportEmployeeDetails from '../components/reports/ReportEmployeeDetails';

type Status = TimesheetStatus | 'ALL';

const ISO = 'YYYY-MM-DD';

export default function ReportsPage() {
  const [from, setFrom] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [to, setTo] = useState<Dayjs | null>(dayjs());
  const [employeeId, setEmployeeId] = useState<string>('ALL');
  const [status, setStatus] = useState<Status>('ALL');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // People whose day-by-day detail is open in the summary table.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (userId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

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

  // Whole-week totals per person (Mon–Sun, including days outside the range),
  // so each week in the details is measured against the full weekly target.
  const weekTotals = useMemo(() => {
    const byUser = new Map<string, Map<string, number>>();
    for (const w of weeks.data ?? []) {
      if (status !== 'ALL' && w.status !== status) continue;
      const m = byUser.get(w.user.id) ?? new Map<string, number>();
      m.set(w.weekStart.slice(0, 10), (m.get(w.weekStart.slice(0, 10)) ?? 0) + toMinutes(w.totalHours));
      byUser.set(w.user.id, m);
    }
    return byUser;
  }, [weeks.data, status]);

  const rangeTarget = report ? rangeTargetMinutes(report.from, report.to) : 0;

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
            slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', md: 180 } } } }}
          />
          <DatePicker
            label="To" value={to} onChange={setTo} minDate={from ?? undefined}
            slotProps={{ textField: { size: 'small', sx: { width: { xs: '100%', md: 180 } }, error: !!rangeError, helperText: rangeError } }}
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
            <Stack direction="row" spacing={{ xs: 2, sm: 4 }} useFlexGap flexWrap="wrap" sx={{ p: 2 }}>
              <Typography variant="body2">
                <strong>{formatMinutes(report.totalMinutes)}</strong> total
              </Typography>
              <Typography variant="body2">
                <strong>{formatMinutes(report.billableMinutes)}</strong> billable
              </Typography>
              <Typography variant="body2">
                <strong>{report.rows.length}</strong> entries
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto !important' }}>
                Click a person to see their day-by-day entries
              </Typography>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      {(() => {
                        const allOpen = report.byEmployee.every((e) => expanded.has(e.userId));
                        return (
                          <Tooltip title={allOpen ? 'Hide all details' : 'Show all details'}>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setExpanded(allOpen ? new Set() : new Set(report.byEmployee.map((e) => e.userId)))
                              }
                            >
                              {allOpen ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Billable</TableCell>
                    <TableCell align="right">Non-billable</TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={`${weekdaysBetween(report.from, report.to)} working days × ${formatMinutes(rangeTarget / Math.max(weekdaysBetween(report.from, report.to), 1))} a day`}
                      >
                        <span>Of {formatMinutes(rangeTarget)}</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.byEmployee.map((e) => {
                    const open = expanded.has(e.userId);
                    return (
                      <Fragment key={e.userId}>
                        <TableRow
                          hover
                          onClick={() => toggle(e.userId)}
                          sx={{ cursor: 'pointer', '& > td': { borderBottom: open ? 'unset' : undefined } }}
                        >
                          <TableCell padding="checkbox">
                            <IconButton size="small" aria-label={open ? 'Hide details' : 'Show details'}>
                              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>{e.employee}</TableCell>
                          <TableCell>{e.employeeCode || '—'}</TableCell>
                          <TableCell align="right">{formatMinutes(e.minutes)}</TableCell>
                          <TableCell align="right">{formatMinutes(e.billableMinutes)}</TableCell>
                          <TableCell align="right">{formatMinutes(e.minutes - e.billableMinutes)}</TableCell>
                          <TableCell align="right" onClick={(ev) => ev.stopPropagation()}>
                            <TargetPercentChip loggedMinutes={e.minutes} targetMinutes={rangeTarget} />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={7} sx={{ py: 0, ...(open ? {} : { borderBottom: 'none' }) }}>
                            <Collapse in={open} timeout="auto" unmountOnExit>
                              <ReportEmployeeDetails
                                rows={report.rows.filter((r) => r.userId === e.userId)}
                                from={report.from}
                                to={report.to}
                                weekTotals={weekTotals.get(e.userId)}
                              />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )
      )}
    </Stack>
  );
}
