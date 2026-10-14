import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Restrained, professional palette — one considered accent (deep teal) against
// neutral greys. This is an internal tool: legibility and calm over flourish.
const base = createTheme({
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
});

export const theme = responsiveFontSizes(
  createTheme(base, {
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      // Tables scroll sideways inside their TableContainer on narrow screens;
      // tighter cells and single-line headers keep them readable there.
      MuiTableCell: {
        styleOverrides: {
          root: { [base.breakpoints.down('sm')]: { padding: '8px 10px' } },
          head: { whiteSpace: 'nowrap' },
        },
      },
      MuiTableContainer: {
        styleOverrides: { root: { WebkitOverflowScrolling: 'touch' } },
      },
      // On a phone a dialog uses nearly the whole width.
      MuiDialog: {
        styleOverrides: {
          paper: {
            [base.breakpoints.down('sm')]: { margin: 12, width: 'calc(100% - 24px)', maxHeight: 'calc(100% - 24px)' },
          },
        },
      },
    },
  }),
);
