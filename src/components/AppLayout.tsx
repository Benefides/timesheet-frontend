import { type ReactNode } from 'react';
import { AppBar, Box, Button, Chip, Container, Stack, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { Me } from '../lib/types';

const NAV: { to: string; label: string; roles: Me['role'][] }[] = [
  { to: '/timesheet', label: 'My timesheet', roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { to: '/approvals', label: 'Approvals', roles: ['MANAGER', 'ADMIN'] },
  { to: '/admin/timesheets', label: 'View timesheets', roles: ['MANAGER', 'ADMIN'] },
  { to: '/admin/users', label: 'People', roles: ['ADMIN'] },
  { to: '/admin/projects', label: 'Projects', roles: ['ADMIN'] },
];

export default function AppLayout({ me, children }: { me: Me; children: ReactNode }) {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const links = NAV.filter((n) => n.roles.includes(me.role));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ color: 'primary.main', mr: 4 }}>Timesheets</Typography>
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {links.map((n) => (
              <Button
                key={n.to} component={RouterLink} to={n.to}
                color={pathname.startsWith(n.to) ? 'primary' : 'inherit'}
                variant={pathname.startsWith(n.to) ? 'outlined' : 'text'}
              >
                {n.label}
              </Button>
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip label={me.role.toLowerCase()} size="small" color="primary" variant="outlined" />
            <Typography variant="body2">{me.displayName}</Typography>
            <Button size="small" color="inherit" onClick={signOut}>Sign out</Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>{children}</Container>
    </Box>
  );
}
