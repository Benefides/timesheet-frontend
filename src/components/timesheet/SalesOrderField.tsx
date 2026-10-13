import { Chip, InputAdornment, TextField } from '@mui/material';

interface SalesOrderFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Sales order (SO) number for an entry. It decides billing: time booked to an
 * SO is billable, time without one is not — the chip says which as you type.
 */
export default function SalesOrderField({ value, onChange }: SalesOrderFieldProps) {
  const billable = value.trim() !== '';
  return (
    <TextField
      label="Sales order (SO) number"
      size="small"
      value={value}
      inputProps={{ maxLength: 50 }}
      helperText="Enter the SO number for billable work. Leave blank for non-billable time."
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <Chip
              size="small"
              variant="outlined"
              label={billable ? 'Billable' : 'Non-billable'}
              color={billable ? 'success' : 'default'}
            />
          </InputAdornment>
        ),
      }}
    />
  );
}
