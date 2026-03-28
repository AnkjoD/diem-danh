"use client"

import { Box, Typography, Button, Paper } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { homuraTheme } from '@/theme/homuraTheme';
import NextLink from 'next/link';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import homuraBg from '@/assets/homura-bg.jpg';

export default function NotFound() {
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
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `url(${homuraBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
          }}
        />
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(26, 14, 36, 0.9)' }} />

        <Paper
          elevation={24}
          sx={{
            position: 'relative',
            zIndex: 1,
            p: 6,
            textAlign: 'center',
            maxWidth: 500,
            borderRadius: 4,
            bgcolor: 'rgba(30, 20, 45, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(192, 132, 252, 0.2)',
          }}
        >
          <SentimentVeryDissatisfiedIcon sx={{ fontSize: 100, color: 'primary.main', mb: 2, opacity: 0.8 }} />
          
          <Typography variant="h1" fontWeight="bold" sx={{
            fontSize: '8rem',
            background: 'linear-gradient(135deg, #c084fc, #fb7185)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
            mb: 2
          }}>
            404
          </Typography>
          
          <Typography variant="h4" fontFamily='"Cinzel", serif' sx={{ color: 'white', mb: 2 }}>
            Lạc lối trong vòng lặp?
          </Typography>
          
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa khỏi hiện thực này. 
            Đừng lo lắng, Homura sẽ dẫn lối bạn quay trở lại.
          </Typography>
          
          <Button
            component={NextLink}
            href="/"
            variant="contained"
            size="large"
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: 3,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: '0 8px 32px rgba(192, 132, 252, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 12px 40px rgba(192, 132, 252, 0.6)',
              }
            }}
          >
            Quay về Trang chủ
          </Button>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
