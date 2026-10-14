import { Autocomplete, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { Project } from '../../lib/types';
import { OTHER_PROJECT_ID } from '../../lib/entryProject';

/** Always listed last, whatever is typed: the way to log an unlisted project. */
const OTHER_OPTION: Project = {
  id: OTHER_PROJECT_ID, code: 'OTHER', name: 'Other (not in list)', isBillable: false,
};

interface ProjectPickerProps {
  projects: Project[];
  /** Currently selected project id ('' when nothing is chosen, OTHER_PROJECT_ID for "Other"). */
  value: string;
  onChange: (project: Project | null) => void;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

/**
 * Type-to-filter project selector. Matching runs over "CODE — Name" so either
 * half finds the project. The value is a real assignment or "Other (not in
 * list)", after which the caller asks for the project name.
 */
export default function ProjectPicker({
  projects,
  value,
  onChange,
  size = 'medium',
  sx,
}: ProjectPickerProps) {
  const options = [...projects, OTHER_OPTION];
  const selected = options.find((p) => p.id === value) ?? null;

  return (
    <Autocomplete
      options={options}
      // Filter the real projects as usual but keep "Other" reachable.
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.trim().toLowerCase();
        const hits = opts.filter(
          (p) => p.id !== OTHER_PROJECT_ID && `${p.code} — ${p.name}`.toLowerCase().includes(q),
        );
        return [...hits, OTHER_OPTION];
      }}
      value={selected}
      onChange={(_, project) => onChange(project)}
      getOptionLabel={(p) => (p.id === OTHER_PROJECT_ID ? p.name : `${p.code} — ${p.name}`)}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      size={size}
      sx={sx}
      autoHighlight // Enter picks the top match, so it's keyboard-only friendly
      openOnFocus
      blurOnSelect
      renderInput={(params) => (
        <TextField {...params} label="Project" placeholder="Type to search…" />
      )}
    />
  );
}
