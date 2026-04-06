"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginApi, registerApi, logoutApi, LoginPayload, RegisterPayload } from '@/common/api/auth';
import { useRouter } from 'next/navigation';

interface UserData {
  id?: string;
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Khôi phục user từ localStorage khi tải trang
    const storedAuth = localStorage.getItem('auth');
    const accessToken = localStorage.getItem('accessToken');
    
    if (storedAuth && storedAuth !== "undefined" && accessToken) {
      try {
        const parsed = JSON.parse(storedAuth);
        setUser(parsed);
      } catch (err) {
        console.error('Failed to parse auth data', err);
        localStorage.removeItem('auth');
        localStorage.removeItem('accessToken');
      }
    } else if (storedAuth || accessToken) {
      // Dọn dẹp nếu dữ liệu không nhất quán
      localStorage.removeItem('auth');
      localStorage.removeItem('accessToken');
    }
    setLoading(false);
  }, []);

  const login = async (data: LoginPayload) => {
    try {
      const res = await loginApi(data);
      // Backend có TransformInterceptor bọc kết quả, axios đã unwrap 1 lớp data
      // Chúng tôi hỗ trợ cả 2 trường hợp tên key: teacher hoặc user
      const target = (res as any)?.data || res;
      const userData = target?.teacher || target?.user;
      const accessToken = target?.access_token || target?.accessToken;

      if (userData && accessToken) {
        setUser(userData);
        localStorage.setItem('auth', JSON.stringify(userData));
        localStorage.setItem('accessToken', accessToken);
        router.push('/dashboard');
      } else {
        throw new Error('Dữ liệu phản hồi từ máy chủ không đúng định dạng');
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterPayload) => {
    try {
      const res = await registerApi(data);
      const target = (res as any)?.data || res;
      const userData = target?.teacher || target?.user;
      const accessToken = target?.access_token || target?.accessToken;

      if (userData && accessToken) {
        setUser(userData);
        localStorage.setItem('auth', JSON.stringify(userData));
        localStorage.setItem('accessToken', accessToken);
        router.push('/dashboard');
      } else {
        throw new Error('Dữ liệu phản hồi đăng ký không đúng định dạng');
      }
    } catch (error: any) {
      console.error('Register Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout API failed', err);
    }
    setUser(null);
    localStorage.removeItem('auth');
    localStorage.removeItem('accessToken');
    router.push('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
