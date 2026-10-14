import { useState, type ReactNode } from 'react';
import {
  AppBar, Box, Button, Chip, Container, Divider, Drawer, IconButton, List, ListItemButton, ListItemText,
  Stack, Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { Me } from '../lib/types';

const NAV: { to: string; label: string; roles: Me['role'][] }[] = [
  { to: '/timesheet', label: 'My timesheet', roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { to: '/approvals', label: 'Approvals', roles: ['MANAGER', 'ADMIN'] },
  { to: '/admin/timesheets', label: 'View timesheets', roles: ['MANAGER', 'ADMIN'] },
  { to: '/reports', label: 'Reports', roles: ['MANAGER', 'ADMIN'] },
  { to: '/admin/users', label: 'People', roles: ['ADMIN'] },
  { to: '/admin/projects', label: 'Projects', roles: ['MANAGER', 'ADMIN'] },
  { to: '/admin/org', label: 'Organisation', roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
];

export default function AppLayout({ me, children }: { me: Me; children: ReactNode }) {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const links = NAV.filter((n) => n.roles.includes(me.role));
  // Seven links don't fit across a phone or small tablet: below `md` the bar
  // collapses to a menu button that opens the same links in a drawer.
  const compact = useMediaQuery(useTheme().breakpoints.down('md'));
  const [menuOpen, setMenuOpen] = useState(false);
  const current = links.find((n) => pathname.startsWith(n.to));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          {compact && (
            <IconButton edge="start" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ color: 'primary.main', mr: compact ? 1 : 4, whiteSpace: 'nowrap' }}>
            Timesheets
          </Typography>

          {compact ? (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1 }}>
              {current?.label}
            </Typography>
          ) : (
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
          )}

          {!compact && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip label={me.role.toLowerCase()} size="small" color="primary" variant="outlined" />
              <Typography variant="body2">{me.displayName}</Typography>
              <Button size="small" color="inherit" onClick={signOut}>Sign out</Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={compact && menuOpen} onClose={() => setMenuOpen(false)}>
        <Box sx={{ width: 270 }} role="navigation">
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>{me.displayName}</Typography>
            <Chip label={me.role.toLowerCase()} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
          </Box>
          <Divider />
          <List>
            {links.map((n) => (
              <ListItemButton
                key={n.to}
                component={RouterLink}
                to={n.to}
                selected={pathname.startsWith(n.to)}
                onClick={() => setMenuOpen(false)}
              >
                <ListItemText primary={n.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Button fullWidth variant="outlined" color="inherit" onClick={signOut}>Sign out</Button>
          </Box>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>{children}</Container>
    </Box>
  );
}
