import { useState } from 'react';
import {
  Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import MicrosoftIcon from '@mui/icons-material/Microsoft';
import { useAuth } from '../auth/AuthProvider';

export default function LoginPage() {
  const { mode, devUsers, signInDev, signInEntra } = useAuth();
  const [email, setEmail] = useState(devUsers[0]?.email ?? '');

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: 420, maxWidth: '100%' }} elevation={0} variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>Timesheets</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Record your time, submit it for approval, and track where the week went.
          </Typography>

          {mode === 'entra' ? (
            <Button
              fullWidth size="large" variant="contained" startIcon={<MicrosoftIcon />}
              onClick={() => void signInEntra()}
            >
              Sign in with Microsoft
            </Button>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Developer sign-in — pick a seeded account.
              </Typography>
              <TextField
                select label="Sign in as" value={email}
                onChange={(e) => setEmail(e.target.value)}
              >
                {devUsers.map((u) => (
                  <MenuItem key={u.email} value={u.email}>{u.label}</MenuItem>
                ))}
              </TextField>
              <Button
                size="large" variant="contained"
                disabled={!email} onClick={() => signInDev(email)}
              >
                Continue
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
