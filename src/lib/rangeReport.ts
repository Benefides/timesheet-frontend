import type { Row, Worksheet } from 'exceljs';
import type { TeamTimesheet, TimesheetStatus } from './types';
import { toMinutes } from './duration';
import { entryProject } from './entryProject';

/** One timesheet entry flattened for the report, already trimmed to the range. */
export interface ReportRow {
  workDate: string; // YYYY-MM-DD
  userId: string;
  employee: string;
  employeeCode: string;
  projectCode: string;
  projectName: string;
  /** Logged against a typed project name ("Other") rather than a listed project. */
  isOtherProject: boolean;
  description: string;
  /** Empty when the entry has no sales order (and is therefore non-billable). */
  salesOrderNumber: string;
  isBillable: boolean;
  minutes: number;
  status: TimesheetStatus;
  loggedBy: string;
}

export interface EmployeeTotal {
  userId: string;
  employee: string;
  employeeCode: string;
  minutes: number;
  billableMinutes: number;
}

export interface ProjectTotal {
  projectCode: string;
  projectName: string;
  isOtherProject: boolean;
  minutes: number;
  billableMinutes: number;
}

export interface SalesOrderTotal {
  /** Empty string groups the entries booked without a sales order. */
  salesOrderNumber: string;
  projectCodes: string[];
  minutes: number;
  billableMinutes: number;
}

export interface RangeReport {
  from: string;
  to: string;
  /** Every calendar day in [from, to], so day-wise views show empty days too. */
  days: string[];
  rows: ReportRow[];
  byEmployee: EmployeeTotal[];
  byProject: ProjectTotal[];
  bySalesOrder: SalesOrderTotal[];
  totalMinutes: number;
  billableMinutes: number;
}

const DAY_MS = 86_400_000;
const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let t = utc(from).getTime(); t <= utc(to).getTime(); t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Grouping key for a project. "Other" entries share the code OTHER, so each
 * typed name is its own group; a listed project is grouped by its code.
 */
const projectKey = (r: Pick<ReportRow, 'projectCode' | 'projectName' | 'isOtherProject'>) =>
  r.isOtherProject ? `other:${r.projectName.trim().toLowerCase()}` : `code:${r.projectCode}`;

/** Totals for a set of rows, grouped by project. */
function totalsByProject(rows: ReportRow[]): ProjectTotal[] {
  const map = new Map<string, ProjectTotal>();
  for (const r of rows) {
    const p = map.get(projectKey(r)) ?? {
      projectCode: r.projectCode, projectName: r.projectName, isOtherProject: r.isOtherProject,
      minutes: 0, billableMinutes: 0,
    };
    p.minutes += r.minutes;
    if (r.isBillable) p.billableMinutes += r.minutes;
    map.set(projectKey(r), p);
  }
  // Listed projects by code, then the "Other" names.
  return [...map.values()].sort(
    (a, b) =>
      Number(a.isOtherProject) - Number(b.isOtherProject) ||
      a.projectCode.localeCompare(b.projectCode) ||
      a.projectName.localeCompare(b.projectName),
  );
}

/** Totals per sales order; entries without one are grouped last. */
function totalsBySalesOrder(rows: ReportRow[]): SalesOrderTotal[] {
  const map = new Map<string, SalesOrderTotal & { codes: Set<string> }>();
  for (const r of rows) {
    const so = map.get(r.salesOrderNumber) ?? {
      salesOrderNumber: r.salesOrderNumber, projectCodes: [], minutes: 0, billableMinutes: 0, codes: new Set(),
    };
    so.minutes += r.minutes;
    if (r.isBillable) so.billableMinutes += r.minutes;
    if (r.projectCode) so.codes.add(r.isOtherProject ? `Other: ${r.projectName}` : r.projectCode);
    map.set(r.salesOrderNumber, so);
  }
  return [...map.values()]
    .map(({ codes, ...so }) => ({ ...so, projectCodes: [...codes].sort() }))
    .sort((a, b) =>
      !a.salesOrderNumber ? 1 : !b.salesOrderNumber ? -1 : a.salesOrderNumber.localeCompare(b.salesOrderNumber),
    );
}

/**
 * Flatten weeks into entries dated within [from, to] (inclusive). The API
 * returns whole weeks overlapping the range, so the edges are trimmed here.
 */
export function buildRangeReport(weeks: TeamTimesheet[], from: string, to: string): RangeReport {
  const rows: ReportRow[] = [];
  for (const week of weeks) {
    for (const e of week.entries) {
      const workDate = e.workDate.slice(0, 10);
      if (workDate < from || workDate > to) continue;
      rows.push({
        workDate,
        userId: week.user.id,
        employee: week.user.displayName,
        employeeCode: week.user.employeeCode ?? '',
        // "Other" entries carry a typed name instead of a catalogue project.
        projectCode: entryProject(e).code,
        projectName: entryProject(e).name,
        isOtherProject: entryProject(e).isOther,
        description: e.description,
        salesOrderNumber: e.salesOrderNumber ?? '',
        isBillable: e.isBillable,
        minutes: toMinutes(e.hours),
        status: week.status,
        loggedBy: e.createdBy?.displayName ?? '',
      });
    }
  }
  rows.sort(
    (a, b) =>
      a.employee.localeCompare(b.employee) ||
      a.workDate.localeCompare(b.workDate) ||
      a.projectCode.localeCompare(b.projectCode),
  );

  const byEmployee = new Map<string, EmployeeTotal>();
  let totalMinutes = 0;
  let billableMinutes = 0;
  for (const r of rows) {
    const billable = r.isBillable ? r.minutes : 0;
    totalMinutes += r.minutes;
    billableMinutes += billable;

    const emp = byEmployee.get(r.userId) ?? {
      userId: r.userId, employee: r.employee, employeeCode: r.employeeCode, minutes: 0, billableMinutes: 0,
    };
    emp.minutes += r.minutes;
    emp.billableMinutes += billable;
    byEmployee.set(r.userId, emp);
  }

  return {
    from,
    to,
    days: daysBetween(from, to),
    rows,
    byEmployee: [...byEmployee.values()].sort((a, b) => a.employee.localeCompare(b.employee)),
    byProject: totalsByProject(rows),
    bySalesOrder: totalsBySalesOrder(rows),
    totalMinutes,
    billableMinutes,
  };
}

// ---------------------------------------------------------------------------
// Workbook
// ---------------------------------------------------------------------------

// Excel stores hours as numbers so the sheet can be summed and pivoted.
const hrs = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
// Zero hours render blank, which keeps the day grids readable.
const HOURS_FMT = '0.00;-0.00;;@';
const DATE_FMT = 'yyyy-mm-dd';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HEADER_FILL = 'FF1F4E79';
const WEEKEND_FILL = 'FFF2F2F2';
const TOTAL_FILL = 'FFDDEBF7';

function styleHeader(row: Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  });
}

function styleTotal(row: Row) {
  row.font = { bold: true };
  row.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
    c.border = { top: { style: 'thin' } };
  });
}

function styleSection(row: Row) {
  row.font = { bold: true, size: 12 };
}

/** Apply a number format to cells [fromCol, toCol] of a row (1-based). */
function formatHours(row: Row, fromCol: number, toCol: number) {
  for (let c = fromCol; c <= toCol; c++) row.getCell(c).numFmt = HOURS_FMT;
}

/** A day row: date + weekday, shaded on weekends. */
function addDayRow(ws: Worksheet, day: string, values: number[], width: number): Row {
  const date = utc(day);
  const row = ws.addRow([date, WEEKDAYS[date.getUTCDay()], ...values]);
  row.getCell(1).numFmt = DATE_FMT;
  formatHours(row, 3, width);
  if (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    for (let c = 1; c <= width; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WEEKEND_FILL } };
    }
  }
  return row;
}

function setWidths(ws: Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

/** Excel sheet names: ≤31 chars, no []:*?/\ and unique (case-insensitively). */
function sheetName(raw: string, used: Set<string>): string {
  const base = raw.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31).trim() || 'Employee';
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

/**
 * One tab per person: a day × project grid for the whole range, then the
 * individual entries behind those numbers.
 */
function addEmployeeSheet(ws: Worksheet, emp: EmployeeTotal, rows: ReportRow[], report: RangeReport) {
  const projects = totalsByProject(rows);
  const width = 2 + projects.length + 3; // date, day, projects…, billable, non-billable, total

  // Both tables share these columns, so each takes the wider of the two needs.
  const gridWidths = [12, 7, ...projects.map(() => 14), 12, 13, 12];
  const entryWidths = [12, 7, 14, 28, 16, 48, 10, 10, 18, 22];
  setWidths(ws, Array.from(
    { length: Math.max(gridWidths.length, entryWidths.length) },
    (_, i) => Math.max(gridWidths[i] ?? 0, entryWidths[i] ?? 0),
  ));

  ws.addRow([emp.employee]).font = { bold: true, size: 14 };
  ws.addRow([`Employee code: ${emp.employeeCode || '—'}`]);
  ws.addRow([`Period: ${report.from} to ${report.to}`]);
  ws.addRow([]);

  // --- Day-wise grid -------------------------------------------------------
  styleSection(ws.addRow(['Day-wise hours']));
  const header = ws.addRow([
    'Date', 'Day',
    ...projects.map((p) => (p.projectName ? `${p.projectCode}\n${p.projectName}` : p.projectCode)),
    'Billable', 'Non-billable', 'Total',
  ]);
  styleHeader(header);
  header.height = 32;
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: header.number }];

  const byDay = new Map<string, ReportRow[]>();
  for (const r of rows) byDay.set(r.workDate, [...(byDay.get(r.workDate) ?? []), r]);

  for (const day of report.days) {
    const dayRows = byDay.get(day) ?? [];
    const perProject = projects.map((p) =>
      dayRows.filter((r) => projectKey(r) === projectKey(p)).reduce((s, r) => s + r.minutes, 0),
    );
    const billable = dayRows.filter((r) => r.isBillable).reduce((s, r) => s + r.minutes, 0);
    const total = dayRows.reduce((s, r) => s + r.minutes, 0);
    addDayRow(ws, day, [...perProject.map(hrs), hrs(billable), hrs(total - billable), hrs(total)], width);
  }

  const totalRow = ws.addRow([
    'Total', '',
    ...projects.map((p) => hrs(p.minutes)),
    hrs(emp.billableMinutes), hrs(emp.minutes - emp.billableMinutes), hrs(emp.minutes),
  ]);
  formatHours(totalRow, 3, width);
  styleTotal(totalRow);

  // --- Entry detail --------------------------------------------------------
  ws.addRow([]);
  ws.addRow([]);
  styleSection(ws.addRow(['Entries']));
  styleHeader(ws.addRow([
    'Date', 'Day', 'Project code', 'Project name', 'SO number', 'Description', 'Billable', 'Hours',
    'Week status', 'Logged by',
  ]));
  for (const r of rows) {
    const date = utc(r.workDate);
    const row = ws.addRow([
      date, WEEKDAYS[date.getUTCDay()], r.projectCode, r.projectName, r.salesOrderNumber, r.description,
      r.isBillable ? 'Yes' : 'No', hrs(r.minutes), r.status.replace('_', ' ').toLowerCase(), r.loggedBy,
    ]);
    row.getCell(1).numFmt = DATE_FMT;
    row.getCell(6).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(8).numFmt = HOURS_FMT;
  }
}

/**
 * The final tab: everyone's totals, a day × employee grid, and project totals
 * across the whole team.
 */
function addConsolidatedSheet(ws: Worksheet, report: RangeReport) {
  const emps = report.byEmployee;
  const dayGridWidth = 2 + emps.length + 1; // date, day, employees…, total

  setWidths(ws, [28, 14, ...emps.map(() => 16), 16, 16]);

  ws.addRow(['Consolidated time report']).font = { bold: true, size: 14 };
  ws.addRow([`Period: ${report.from} to ${report.to}`]);
  ws.addRow([`Generated: ${new Date().toLocaleString()}`]);
  ws.addRow([]);

  // --- Totals by employee --------------------------------------------------
  styleSection(ws.addRow(['Totals by employee']));
  styleHeader(ws.addRow(['Employee', 'Employee code', 'Billable', 'Non-billable', 'Total']));
  for (const e of emps) {
    formatHours(ws.addRow([
      e.employee, e.employeeCode, hrs(e.billableMinutes), hrs(e.minutes - e.billableMinutes), hrs(e.minutes),
    ]), 3, 5);
  }
  const empTotal = ws.addRow([
    'Total', '', hrs(report.billableMinutes), hrs(report.totalMinutes - report.billableMinutes), hrs(report.totalMinutes),
  ]);
  formatHours(empTotal, 3, 5);
  styleTotal(empTotal);

  // --- Day-wise across employees -------------------------------------------
  ws.addRow([]);
  ws.addRow([]);
  styleSection(ws.addRow(['Day-wise hours by employee']));
  const header = ws.addRow(['Date', 'Day', ...emps.map((e) => e.employee), 'Total']);
  styleHeader(header);

  const minutesFor = new Map<string, number>(); // `${userId}|${day}` → minutes
  for (const r of report.rows) {
    const key = `${r.userId}|${r.workDate}`;
    minutesFor.set(key, (minutesFor.get(key) ?? 0) + r.minutes);
  }
  for (const day of report.days) {
    const perEmp = emps.map((e) => minutesFor.get(`${e.userId}|${day}`) ?? 0);
    addDayRow(ws, day, [...perEmp.map(hrs), hrs(perEmp.reduce((s, m) => s + m, 0))], dayGridWidth);
  }
  const dayTotal = ws.addRow(['Total', '', ...emps.map((e) => hrs(e.minutes)), hrs(report.totalMinutes)]);
  formatHours(dayTotal, 3, dayGridWidth);
  styleTotal(dayTotal);

  // --- Totals by project ---------------------------------------------------
  ws.addRow([]);
  ws.addRow([]);
  styleSection(ws.addRow(['Totals by project']));
  styleHeader(ws.addRow(['Project name', 'Project code', 'Billable', 'Non-billable', 'Total']));
  for (const p of report.byProject) {
    formatHours(ws.addRow([
      p.projectName, p.projectCode, hrs(p.billableMinutes), hrs(p.minutes - p.billableMinutes), hrs(p.minutes),
    ]), 3, 5);
  }
  const projTotal = ws.addRow([
    'Total', '', hrs(report.billableMinutes), hrs(report.totalMinutes - report.billableMinutes), hrs(report.totalMinutes),
  ]);
  formatHours(projTotal, 3, 5);
  styleTotal(projTotal);

  // --- Totals by sales order -----------------------------------------------
  ws.addRow([]);
  ws.addRow([]);
  styleSection(ws.addRow(['Totals by sales order (SO)']));
  styleHeader(ws.addRow(['SO number', 'Project code(s)', 'Billable', 'Non-billable', 'Total']));
  for (const so of report.bySalesOrder) {
    formatHours(ws.addRow([
      so.salesOrderNumber || 'No SO number', so.projectCodes.join(', '),
      hrs(so.billableMinutes), hrs(so.minutes - so.billableMinutes), hrs(so.minutes),
    ]), 3, 5);
  }
  const soTotal = ws.addRow([
    'Total', '', hrs(report.billableMinutes), hrs(report.totalMinutes - report.billableMinutes), hrs(report.totalMinutes),
  ]);
  formatHours(soTotal, 3, 5);
  styleTotal(soTotal);
}

/** Build the workbook and hand it to the browser as a download. */
export async function downloadRangeReportXlsx(report: RangeReport): Promise<void> {
  // exceljs is large; load it only when someone actually exports.
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const used = new Set<string>(['consolidated']);
  for (const emp of report.byEmployee) {
    const ws = wb.addWorksheet(sheetName(emp.employee, used));
    addEmployeeSheet(ws, emp, report.rows.filter((r) => r.userId === emp.userId), report);
  }
  addConsolidatedSheet(wb.addWorksheet('Consolidated'), report);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timesheet-report_${report.from}_to_${report.to}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
