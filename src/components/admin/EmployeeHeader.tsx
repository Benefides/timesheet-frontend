import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { AdminUser } from '../../lib/types';

interface EmployeeHeaderProps {
  employee: AdminUser;
}

export default function EmployeeHeader({ employee }: EmployeeHeaderProps) {
  const navigate = useNavigate();

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button variant="text" size="small" onClick={() => navigate('/admin/users')}>
            People
          </Button>
          <Typography>/</Typography>
          <Typography variant="h6">{employee.displayName}</Typography>
        </Stack>
        <Typography color="text.secondary" variant="body2">
          {employee.email} · {employee.role.toLowerCase()}
        </Typography>
      </Box>
    </Stack>
  );
}
