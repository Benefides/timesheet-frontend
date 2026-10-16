import { Autocomplete, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { Project } from '../../lib/types';
import { OTHER_PROJECT_ID } from '../../lib/entryProject';

/** Stands for a typed-in project name: the way to log an unlisted project. */
const OTHER_OPTION: Project = {
  id: OTHER_PROJECT_ID, code: 'OTHER', name: 'Other (not in list)', isBillable: false,
};

interface ProjectPickerProps {
  projects: Project[];
  /** Currently selected project id ('' when nothing is chosen, OTHER_PROJECT_ID for a typed name). */
  value: string;
  /**
   * The typed project name. Passing it lets people type a project that isn't
   * listed; it arrives as OTHER_PROJECT_ID plus the text in `onChange`.
   */
  customName?: string;
  onChange: (project: Project | null, typedName: string) => void;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

const label = (p: Project) => `${p.code} — ${p.name}`;

/**
 * Type-to-filter project selector. Matching runs over "CODE — Name" so either
 * half finds the project. With `customName` it also takes free text: anything
 * that isn't picked from the list is saved as the project name for that entry.
 */
export default function ProjectPicker({
  projects,
  value,
  customName,
  onChange,
  size = 'medium',
  sx,
}: ProjectPickerProps) {
  const typable = customName !== undefined;
  const selected = projects.find((p) => p.id === value) ?? null;
  const isTyped = value === OTHER_PROJECT_ID;
  const text = selected ? label(selected) : isTyped ? customName ?? '' : '';

  // Typing the exact code or name of a listed project means that project.
  const exact = (t: string) => {
    const q = t.trim().toLowerCase();
    return projects.find((p) => [p.code, p.name, label(p)].some((s) => s.toLowerCase() === q));
  };

  return (
    <Autocomplete<Project, false, false, boolean>
      options={projects}
      freeSolo={typable}
      value={selected}
      inputValue={typable ? text : undefined}
      onInputChange={(_, t, reason) => {
        // Picks and resets arrive through onChange; only follow the typing here.
        if (!typable || reason !== 'input') return;
        if (selected && t === label(selected)) return;
        onChange(t.trim() ? OTHER_OPTION : null, t);
      }}
      onChange={(_, picked) => {
        if (typeof picked === 'string') {
          const match = exact(picked);
          onChange(match ?? (picked.trim() ? OTHER_OPTION : null), match ? '' : picked);
        } else {
          onChange(picked, '');
        }
      }}
      onBlur={() => {
        const match = isTyped && exact(customName ?? '');
        if (match) onChange(match, '');
      }}
      getOptionLabel={(p) => (typeof p === 'string' ? p : label(p))}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      size={size}
      sx={sx}
      autoHighlight={!typable} // Enter picks the top match; with free text, Enter keeps what was typed
      openOnFocus
      blurOnSelect
      renderInput={(params) => (
        <TextField
          {...params}
          label="Project"
          placeholder={typable ? 'Pick from the list or type a project name' : 'Type to search…'}
          required={typable && isTyped}
          inputProps={{ ...params.inputProps, ...(typable ? { maxLength: 160 } : {}) }}
          helperText={
            typable && isTyped && customName?.trim()
              ? 'Not in the project list, so it will be saved with this name. An admin can move it onto the project once it is set up.'
              : undefined
          }
        />
      )}
    />
  );
}
