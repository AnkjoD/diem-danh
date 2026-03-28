import { createTheme } from "@mui/material/styles";

export const homuraTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a855f7', // homura purple
      light: '#c084fc',
      dark: '#7c3aed',
    },
    secondary: {
      main: '#e11d48', // homura red
      light: '#fb7185',
      dark: '#9f1239',
    },
    background: {
      default: '#1a0e24',
      paper: '#241530',
    },
    text: {
      primary: '#e8d5f5',
      secondary: '#a78bba',
    },
    error: {
      main: '#ef4444',
    },
    divider: 'rgba(168, 85, 247, 0.25)',
  },
  typography: {
    fontFamily: '"Noto Sans JP", sans-serif',
    h1: { fontFamily: '"Cinzel", serif' },
    h2: { fontFamily: '"Cinzel", serif' },
    h3: { fontFamily: '"Cinzel", serif' },
    h4: { fontFamily: '"Cinzel", serif' },
    h5: { fontFamily: '"Cinzel", serif' },
    h6: { fontFamily: '"Cinzel", serif' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(36, 21, 48, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(168, 85, 247, 0.15)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: 'linear-gradient(135deg, #a855f7, #e11d48)',
          '&:hover': {
            background: 'linear-gradient(135deg, #c084fc, #fb7185)',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontFamily: '"Cinzel", serif',
          fontWeight: 600,
          color: '#c084fc',
          borderBottom: '2px solid rgba(168, 85, 247, 0.3)',
        },
        body: {
          borderBottom: '1px solid rgba(168, 85, 247, 0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});