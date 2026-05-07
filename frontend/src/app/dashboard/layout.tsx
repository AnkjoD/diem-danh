"use client"

import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar, Toolbar, Typography, Container, Box, Button, Drawer,
  List, ListItemButton, ListItemIcon, ListItemText, Divider, IconButton,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PeopleIcon from '@mui/icons-material/People';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import HistoryIcon from '@mui/icons-material/History';
import { homuraTheme } from '@/theme/homuraTheme';
import { useAuth } from '@/contexts/AuthContext';
import homuraBg from '@/assets/homura-bg.jpg';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ConfirmProvider } from '@/hooks/useConfirm';

const DRAWER_WIDTH = 240;

const navItems = [
  { label: 'Môn học & Lớp', icon: <MenuBookIcon />, href: '/dashboard' },
  { label: 'Học sinh', icon: <PeopleIcon />, href: '/dashboard/students' },
  { label: 'Điểm danh', icon: <CameraAltIcon />, href: '/dashboard/attendance' },
  { label: 'Lịch sử chi tiết', icon: <HistoryIcon />, href: '/dashboard/stats' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" fontFamily='"Cinzel", serif' sx={{
          background: 'linear-gradient(135deg, #c084fc, #fb7185)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
          fontSize: '1rem', fontWeight: 900, letterSpacing: 2
        }}>
          ✦ HOMURA ✦
        </Typography>
        <Box sx={{ 
          mt: 1, px: 1.5, py: 0.5, borderRadius: 10, bgcolor: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.3)', display: 'inline-block',
          boxShadow: '0 0 10px rgba(168,85,247,0.2)'
        }}>
          <Typography sx={{ color: '#c084fc', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
            GIẢNG VIÊN
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: 'rgba(168,85,247,0.2)' }} />
      <List sx={{ flex: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.href}
            component={NextLink}
            href={item.href}
            selected={pathname === item.href}
            onClick={() => setMobileOpen(false)}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'rgba(168,85,247,0.15)',
                borderRight: '3px solid',
                borderColor: 'primary.main',
              },
            }}
          >
            <ListItemIcon sx={{ color: pathname === item.href ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(168,85,247,0.2)' }} />
      <Box sx={{ p: 2 }}>
        <Button 
          fullWidth 
          color="error" 
          variant="outlined" 
          size="small" 
          startIcon={<LogoutIcon />} 
          onClick={logout}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          Đăng xuất
        </Button>
      </Box>
    </Box>
  );

  const currentTitle = navItems.find((n) => n.href === pathname)?.label || "Dashboard";

  return (
    <ProtectedRoute>
      <ThemeProvider theme={homuraTheme}>
        <ConfirmProvider>
          <CssBaseline />
          <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
            <Box sx={{ position: 'fixed', inset: 0, backgroundImage: `url(${homuraBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.08, zIndex: 0 }} />
            <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(26,14,36,0.92)', zIndex: 0 }} />

            {/* Mobile AppBar */}
            <AppBar position="fixed" sx={{ display: { md: 'none' }, bgcolor: 'rgba(26,14,36,0.95)', backdropFilter: 'blur(12px)', zIndex: 1201 }}>
              <Toolbar>
                <IconButton edge="start" color="inherit" onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>
                <Typography variant="h6" sx={{ ml: 1 }}>{currentTitle}</Typography>
              </Toolbar>
            </AppBar>

            {/* Drawer */}
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'rgba(26,14,36,0.98)' } }}
            >
              {drawerContent}
            </Drawer>
            <Drawer
              variant="permanent"
              sx={{
                display: { xs: 'none', md: 'block' },
                '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'rgba(26,14,36,0.95)', borderRight: '1px solid rgba(168,85,247,0.15)', position: 'relative' },
              }}
            >
              {drawerContent}
            </Drawer>

            {/* Main content */}
            <Box component="main" sx={{ flexGrow: 1, position: 'relative', zIndex: 1, mt: { xs: '64px', md: 0 } }}>
              <Container maxWidth="lg" sx={{ py: 3 }}>
                {children}
              </Container>
            </Box>
          </Box>
        </ConfirmProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
