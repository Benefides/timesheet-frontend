import { MenuItem, TextField } from '@mui/material';
import type { TimesheetStatus } from '../../lib/types';

type Status = TimesheetStatus | 'ALL';

const STATUSES: Status[] = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

interface StatusFilterProps {
  value: Status;
  onChange: (status: Status) => void;
}

export default function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <TextField
      select
      size="small"
      label="Status"
      value={value}
      sx={{ minWidth: 160 }}
      onChange={(e) => onChange(e.target.value as Status)}
    >
      {STATUSES.map((s) => (
        <MenuItem key={s} value={s}>
          {s === 'ALL' ? 'All statuses' : s.toLowerCase()}
        </MenuItem>
      ))}
    </TextField>
  );
}
