import type { TimesheetEntry } from './types';

/**
 * Picker value meaning "Other (not in list)": the person types the project name
 * for this entry because the project isn't set up yet. Never sent to the API —
 * it becomes projectId: null plus customProjectName.
 */
export const OTHER_PROJECT_ID = '__other__';

export interface EntryProject {
  code: string;
  name: string;
  /** True when the project was typed in rather than picked from the list. */
  isOther: boolean;
}

/** How an entry's project is shown everywhere: catalogue project or "Other". */
export function entryProject(
  e: Pick<TimesheetEntry, 'project' | 'customProjectName'>,
): EntryProject {
  if (e.project) return { code: e.project.code, name: e.project.name, isOther: false };
  return { code: 'OTHER', name: e.customProjectName ?? '', isOther: true };
}

/** One-line label: "ALPHA" or "Other: New client portal". */
export function entryProjectLabel(e: Pick<TimesheetEntry, 'project' | 'customProjectName'>): string {
  const p = entryProject(e);
  return p.isOther ? `Other: ${p.name}` : p.code;
}

/** The API fields for a picker value plus the typed name. */
export function projectFields(pickerValue: string, typedName: string) {
  return pickerValue === OTHER_PROJECT_ID
    ? { projectId: null, customProjectName: typedName.trim() }
    : { projectId: pickerValue, customProjectName: null };
}
