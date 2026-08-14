import { Button, Paper, Stack, Typography } from '@mui/material';
import type { AdminUser } from '../../lib/types';

interface EmployeesListProps {
  employees: AdminUser[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export default function EmployeesList({
  employees,
  selectedId,
  onSelect,
  isLoading,
}: EmployeesListProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
        Team
      </Typography>
      <Stack spacing={1}>
        {isLoading ? (
          <Typography color="text.secondary" variant="body2">
            Loading…
          </Typography>
        ) : (
          employees.map((e) => (
            <Button
              key={e.id}
              fullWidth
              variant={selectedId === e.id ? 'contained' : 'text'}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontWeight: selectedId === e.id ? 600 : 400,
              }}
              onClick={() => onSelect(e.id)}
            >
              <Stack sx={{ width: '100%', textAlign: 'left' }}>
                <Typography variant="body2">{e.displayName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {e.role.toLowerCase()}
                </Typography>
              </Stack>
            </Button>
          ))
        )}
      </Stack>
    </Paper>
  );
}
