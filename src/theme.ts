import { createTheme } from '@mui/material/styles';

// Restrained, professional palette — one considered accent (deep teal) against
// neutral greys. This is an internal tool: legibility and calm over flourish.
export const theme = createTheme({
  palette: {
    primary: { main: '#0f766e' },   // teal-700
    secondary: { main: '#334155' }, // slate-700
    background: { default: '#f8fafc' },
    success: { main: '#15803d' },
    warning: { main: '#b45309' },
    error: { main: '#b91c1c' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});
