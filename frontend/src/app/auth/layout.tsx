"use client"

import { Box } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { homuraTheme } from '@/theme/homuraTheme';
import homuraBg from '@/assets/homura-bg.jpg';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={homuraTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `url(${homuraBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
          }}
        />
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(26, 14, 36, 0.85)' }} />
        
        {children}
      </Box>
    </ThemeProvider>
  );
}
