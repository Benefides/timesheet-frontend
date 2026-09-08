import { Autocomplete, Chip, TextField } from '@mui/material';
import type { Coworker } from '../../lib/types';

interface CoworkerPickerProps {
  /** Colleagues on the same project that day — the only valid choices. */
  coworkers: Coworker[];
  /** Selected colleague ids. */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  isLoading?: boolean;
}

/**
 * Names colleagues who worked the same block of time. Each one named gets their
 * own copy of the entry in their own timesheet, so the list is constrained to
 * people the server will accept: those assigned to the project on that day.
 */
export default function CoworkerPicker({
  coworkers,
  value,
  onChange,
  disabled = false,
  size = 'medium',
  isLoading = false,
}: CoworkerPickerProps) {
  const selected = coworkers.filter((c) => value.includes(c.id));

  const placeholder = disabled
    ? 'Pick a project first'
    : isLoading
      ? 'Loading…'
      : coworkers.length
        ? 'Type a name…'
        : 'Nobody else is on this project that day';

  return (
    <Autocomplete
      multiple
      options={coworkers}
      value={selected}
      disabled={disabled || (!isLoading && coworkers.length === 0)}
      onChange={(_, picked) => onChange(picked.map((p) => p.id))}
      getOptionLabel={(c) => c.displayName}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      size={size}
      openOnFocus
      renderTags={(tags, getTagProps) =>
        tags.map((c, i) => (
          <Chip {...getTagProps({ index: i })} key={c.id} size="small" label={c.displayName} />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Also log this for"
          placeholder={placeholder}
          helperText="They each get the same entry in their own timesheet"
        />
      )}
    />
  );
}
