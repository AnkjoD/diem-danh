"use client"

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  IconButton,
  InputAdornment,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Xác nhận mật khẩu'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const { user, loading, login: contextLogin, register: contextRegister } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginForm) => {
    setError('');
    setSubmitting(true);
    try {
      await contextLogin(data);
    } catch (error: any) {
      const msg = (error?.response?.data as any)?.message;
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setError(msg || "Tài khoản hoặc mật khẩu không chính xác!");
      } else {
        setError(msg || "Lỗi máy chủ!");
      }
      setSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await contextRegister({
        full_name: data.email.split('@')[0],
        email: data.email,
        password: data.password
      });
      setSuccess("Đăng ký thành công!");
    } catch (error: any) {
      const msg = (error?.response?.data as any)?.message;
      if (error?.response?.status === 409) {
        setError(msg || "Email này đã được đăng ký!");
      } else {
        setError(msg || "Lỗi máy chủ!");
      }
      setSubmitting(false);
    }
  };

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setError('');
    setSuccess('');
    setShowPassword(false);
    loginForm.reset();
    registerForm.reset();
  };

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        position: 'relative',
        zIndex: 1,
        p: 4,
        maxWidth: 420,
        width: '100%',
        mx: 2,
        borderRadius: 3,
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        {isLogin ? (
          <>
            <LockOutlinedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontFamily='"Cinzel", serif' sx={{
              background: 'linear-gradient(135deg, #2dd4bf, #fb7185)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              ✦ LOGIN ✦
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chào mừng trở lại với Homura
            </Typography>
          </>
        ) : (
          <>
            <HowToRegOutlinedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" fontFamily='"Cinzel", serif' sx={{
              background: 'linear-gradient(135deg, #2dd4bf, #fb7185)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              ✦ REGISTER ✦
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tham gia vào vòng lặp Homura
            </Typography>
          </>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box>
        {isLogin ? (
          <Box component="form" onSubmit={loginForm.handleSubmit(handleLogin)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              {...loginForm.register('email')}
              type="email"
              label="Email"
              placeholder="Nhập email của bạn"
              error={!!loginForm.formState.errors.email}
              helperText={loginForm.formState.errors.email?.message}
              fullWidth
            />
            <TextField
              {...loginForm.register('password')}
              type={showPassword ? 'text' : 'password'}
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              error={!!loginForm.formState.errors.password}
              helperText={loginForm.formState.errors.password?.message}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#fff' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth sx={{ mt: 1 }}>
              {submitting ? <CircularProgress size={24} /> : 'Đăng nhập'}
            </Button>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Chưa có tài khoản?{' '}
                <Link component="button" type="button" onClick={() => switchTab(false)} sx={{ fontWeight: 'bold' }}>
                  Đăng ký ngay
                </Link>
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={registerForm.handleSubmit(handleRegister)} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              {...registerForm.register('email')}
              type="email"
              label="Email"
              placeholder="Nhập email của bạn"
              error={!!registerForm.formState.errors.email}
              helperText={registerForm.formState.errors.email?.message}
              fullWidth
            />
            <TextField
              {...registerForm.register('password')}
              type={showPassword ? 'text' : 'password'}
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              error={!!registerForm.formState.errors.password}
              helperText={registerForm.formState.errors.password?.message}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#fff' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
            <TextField
              {...registerForm.register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu"
              error={!!registerForm.formState.errors.confirmPassword}
              helperText={registerForm.formState.errors.confirmPassword?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        sx={{ color: '#fff' }}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth sx={{ mt: 1 }}>
              {submitting ? <CircularProgress size={24} /> : 'Đăng ký tài khoản'}
            </Button>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Đã có tài khoản?{' '}
                <Link component="button" type="button" onClick={() => switchTab(true)} sx={{ fontWeight: 'bold' }}>
                  Đăng nhập ngay
                </Link>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default AuthPage;