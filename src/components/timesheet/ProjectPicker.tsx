import { Autocomplete, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { Project } from '../../lib/types';

interface ProjectPickerProps {
  projects: Project[];
  /** Currently selected project id ('' when nothing is chosen). */
  value: string;
  onChange: (project: Project | null) => void;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

/**
 * Type-to-filter project selector. Matching runs over "CODE — Name" so either
 * half finds the project, and the value stays constrained to a real assignment
 * — free text can't be submitted.
 */
export default function ProjectPicker({
  projects,
  value,
  onChange,
  size = 'medium',
  sx,
}: ProjectPickerProps) {
  const selected = projects.find((p) => p.id === value) ?? null;

  return (
    <Autocomplete
      options={projects}
      value={selected}
      onChange={(_, project) => onChange(project)}
      getOptionLabel={(p) => `${p.code} — ${p.name}`}
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
