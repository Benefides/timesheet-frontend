import type { TeamTimesheet, TimesheetStatus } from './types';
import { toMinutes } from './duration';

/** One timesheet entry flattened for the report, already trimmed to the range. */
export interface ReportRow {
  workDate: string; // YYYY-MM-DD
  employee: string;
  employeeCode: string;
  projectCode: string;
  projectName: string;
  description: string;
  isBillable: boolean;
  minutes: number;
  status: TimesheetStatus;
  loggedBy: string;
}

export interface EmployeeTotal {
  employee: string;
  employeeCode: string;
  minutes: number;
  billableMinutes: number;
}

export interface ProjectTotal {
  projectCode: string;
  projectName: string;
  minutes: number;
  billableMinutes: number;
}

export interface RangeReport {
  from: string;
  to: string;
  rows: ReportRow[];
  byEmployee: EmployeeTotal[];
  byProject: ProjectTotal[];
  totalMinutes: number;
  billableMinutes: number;
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
        employee: week.user.displayName,
        employeeCode: week.user.employeeCode ?? '',
        projectCode: e.project?.code ?? '',
        projectName: e.project?.name ?? '',
        description: e.description,
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
  const byProject = new Map<string, ProjectTotal>();
  let totalMinutes = 0;
  let billableMinutes = 0;
  for (const r of rows) {
    const billable = r.isBillable ? r.minutes : 0;
    totalMinutes += r.minutes;
    billableMinutes += billable;

    const empKey = `${r.employee}\u0000${r.employeeCode}`;
    const emp = byEmployee.get(empKey) ?? {
      employee: r.employee, employeeCode: r.employeeCode, minutes: 0, billableMinutes: 0,
    };
    emp.minutes += r.minutes;
    emp.billableMinutes += billable;
    byEmployee.set(empKey, emp);

    const proj = byProject.get(r.projectCode) ?? {
      projectCode: r.projectCode, projectName: r.projectName, minutes: 0, billableMinutes: 0,
    };
    proj.minutes += r.minutes;
    proj.billableMinutes += billable;
    byProject.set(r.projectCode, proj);
  }

  return {
    from,
    to,
    rows,
    byEmployee: [...byEmployee.values()].sort((a, b) => a.employee.localeCompare(b.employee)),
    byProject: [...byProject.values()].sort((a, b) => a.projectCode.localeCompare(b.projectCode)),
    totalMinutes,
    billableMinutes,
  };
}

// Excel stores hours as numbers so the sheet can be summed and pivoted.
const hrs = (minutes: number) => Math.round((minutes / 60) * 100) / 100;
const HOURS_FMT = '0.00';

/** Build the workbook and hand it to the browser as a download. */
export async function downloadRangeReportXlsx(report: RangeReport): Promise<void> {
  // exceljs is large; load it only when someone actually exports.
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const headerStyle = (row: import('exceljs').Row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.eachCell((c) => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      c.alignment = { vertical: 'middle' };
    });
  };
  const totalStyle = (row: import('exceljs').Row) => {
    row.font = { bold: true };
    row.eachCell((c) => {
      c.border = { top: { style: 'thin' } };
    });
  };

  // --- Summary -------------------------------------------------------------
  const summary = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 5 }] });
  summary.columns = [
    { key: 'employee', width: 30 },
    { key: 'code', width: 14 },
    { key: 'total', width: 14, style: { numFmt: HOURS_FMT } },
    { key: 'billable', width: 14, style: { numFmt: HOURS_FMT } },
    { key: 'nonBillable', width: 16, style: { numFmt: HOURS_FMT } },
  ];
  summary.addRow(['Time range report']).font = { bold: true, size: 14 };
  summary.addRow([`Period: ${report.from} to ${report.to}`]);
  summary.addRow([`Generated: ${new Date().toLocaleString()}`]);
  summary.addRow([]);
  headerStyle(summary.addRow(['Employee', 'Employee code', 'Total hours', 'Billable hours', 'Non-billable hours']));
  for (const e of report.byEmployee) {
    summary.addRow([
      e.employee, e.employeeCode, hrs(e.minutes), hrs(e.billableMinutes), hrs(e.minutes - e.billableMinutes),
    ]);
  }
  totalStyle(summary.addRow([
    'Total', '', hrs(report.totalMinutes), hrs(report.billableMinutes),
    hrs(report.totalMinutes - report.billableMinutes),
  ]));

  // --- By project ----------------------------------------------------------
  const projects = wb.addWorksheet('By project', { views: [{ state: 'frozen', ySplit: 1 }] });
  projects.columns = [
    { header: 'Project code', key: 'code', width: 16 },
    { header: 'Project name', key: 'name', width: 34 },
    { header: 'Total hours', key: 'total', width: 14, style: { numFmt: HOURS_FMT } },
    { header: 'Billable hours', key: 'billable', width: 14, style: { numFmt: HOURS_FMT } },
    { header: 'Non-billable hours', key: 'nonBillable', width: 18, style: { numFmt: HOURS_FMT } },
  ];
  headerStyle(projects.getRow(1));
  for (const p of report.byProject) {
    projects.addRow([
      p.projectCode, p.projectName, hrs(p.minutes), hrs(p.billableMinutes), hrs(p.minutes - p.billableMinutes),
    ]);
  }
  totalStyle(projects.addRow([
    'Total', '', hrs(report.totalMinutes), hrs(report.billableMinutes),
    hrs(report.totalMinutes - report.billableMinutes),
  ]));

  // --- Entries -------------------------------------------------------------
  const entries = wb.addWorksheet('Entries', { views: [{ state: 'frozen', ySplit: 1 }] });
  entries.columns = [
    { header: 'Date', key: 'date', width: 12, style: { numFmt: 'yyyy-mm-dd' } },
    { header: 'Employee', key: 'employee', width: 26 },
    { header: 'Employee code', key: 'code', width: 14 },
    { header: 'Project code', key: 'projectCode', width: 14 },
    { header: 'Project name', key: 'projectName', width: 28 },
    { header: 'Description', key: 'description', width: 48 },
    { header: 'Billable', key: 'billable', width: 10 },
    { header: 'Hours', key: 'hours', width: 10, style: { numFmt: HOURS_FMT } },
    { header: 'Week status', key: 'status', width: 18 },
    { header: 'Logged by', key: 'loggedBy', width: 22 },
  ];
  headerStyle(entries.getRow(1));
  for (const r of report.rows) {
    entries.addRow({
      // A UTC midnight date shows as that same calendar day in Excel.
      date: new Date(`${r.workDate}T00:00:00.000Z`),
      employee: r.employee,
      code: r.employeeCode,
      projectCode: r.projectCode,
      projectName: r.projectName,
      description: r.description,
      billable: r.isBillable ? 'Yes' : 'No',
      hours: hrs(r.minutes),
      status: r.status.replace('_', ' ').toLowerCase(),
      loggedBy: r.loggedBy,
    });
  }
  entries.autoFilter = { from: 'A1', to: 'J1' };

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
