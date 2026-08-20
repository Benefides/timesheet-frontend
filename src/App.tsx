import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { useMe } from './lib/hooks';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import TimesheetPage from './pages/TimesheetPage';
import ApprovalsPage from './pages/ApprovalsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminTimesheetsPage from './pages/AdminTimesheetsPage';
import AdminProjectsPage from './pages/AdminProjectsPage';
import OrgChartPage from './pages/OrgChartPage';
import EmployeeTimesheetsPage from './pages/EmployeeTimesheetsPage';

function Centered({ children }: { children: ReactNode }) {
  return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>{children}</Box>;
}

export default function App() {
  const { ready, isAuthenticated } = useAuth();

  // Nothing that calls the API may mount until MSAL has initialised and the
  // active account is set — otherwise the request interceptor has no account
  // to acquire a token from and sends an unauthenticated request.
  if (!ready) return <Centered><CircularProgress /></Centered>;
  if (!isAuthenticated) return <LoginPage />;

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { signOut } = useAuth();
  const me = useMe();

  // Authenticated locally, but resolving the app profile from the backend.
  if (me.isLoading) return <Centered><CircularProgress /></Centered>;

  if (me.isError || !me.data) {
    return (
      <Centered>
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 420 }}>
          <Typography variant="h6" gutterBottom>Couldn’t load your profile</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            The server is reachable but rejected the session. Check the API is running and try signing in again.
          </Typography>
          <Button variant="contained" onClick={signOut}>Back to sign in</Button>
        </Paper>
      </Centered>
    );
  }

  // First-login users can sign in but can’t transact until an admin sets them up.
  if (me.data.status === 'PENDING_SETUP') {
    return (
      <Centered>
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 460 }}>
          <Typography variant="h6" gutterBottom>You’re almost set up</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your account is created but an administrator still needs to assign your department, manager and
            projects before you can record time. You’ll get access as soon as that’s done.
          </Typography>
          <Button variant="outlined" onClick={signOut}>Sign out</Button>
        </Paper>
      </Centered>
    );
  }

  const canApprove = me.data.role === 'MANAGER' || me.data.role === 'ADMIN';
  const isAdmin = me.data.role === 'ADMIN';

  return (
    <AppLayout me={me.data}>
      <Routes>
        <Route path="/timesheet" element={<TimesheetPage />} />
        {canApprove && <Route path="/approvals" element={<ApprovalsPage />} />}
        {isAdmin && <Route path="/admin/users" element={<AdminUsersPage />} />}
        {canApprove && <Route path="/admin/projects" element={<AdminProjectsPage />} />}
        <Route path="/admin/org" element={<OrgChartPage />} />
        {isAdmin && <Route path="/admin/employees/:employeeId" element={<EmployeeTimesheetsPage />} />}
        {canApprove && <Route path="/admin/timesheets" element={<AdminTimesheetsPage />} />}
        <Route path="*" element={<Navigate to="/timesheet" replace />} />
      </Routes>
    </AppLayout>
  );
}
