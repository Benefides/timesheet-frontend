export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
export type UserStatus = 'PENDING_SETUP' | 'ACTIVE' | 'DISABLED';
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Me {
  id: string;
  email: string;
  displayName: string;
  employeeCode: string | null;
  role: Role;
  status: UserStatus;
  department?: { name: string } | null;
  manager?: { id: string; displayName: string } | null;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  isBillable: boolean;
}

export interface TimesheetEntry {
  id: string;
  projectId: string;
  workDate: string;
  hours: string; // Decimal serialised as string
  isBillable: boolean;
  description: string;
  project?: { code: string; name: string };
}

export interface Timesheet {
  id: string;
  weekStart: string;
  status: TimesheetStatus;
  totalHours: string;
  billableHours: string;
  entries: TimesheetEntry[];
}

export interface PendingItem {
  id: string;
  weekStart: string;
  totalHours: string;
  billableHours: string;
  submittedAt: string | null;
  user: { displayName: string; employeeCode: string | null };
}

export interface TeamTimesheet {
  id: string;
  weekStart: string;
  status: TimesheetStatus;
  totalHours: string;
  billableHours: string;
  submittedAt: string | null;
  decidedAt: string | null;
  user: { id: string; displayName: string; employeeCode: string | null };
  entries: TimesheetEntry[];
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  employeeCode?: string | null;
  role: Role;
  status: UserStatus;
  managerId?: string | null;
}

export interface AdminProject extends Project {
  isActive: boolean;
}

export interface AdminAssignment {
  id: string;
  userId: string;
  projectId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  user: { id: string; displayName: string; employeeCode: string | null };
}
