"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Typography,
  Box,
  IconButton,
  InputAdornment,
  Link,
  Alert,
} from "@mui/material";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import AuthLayout from "@/components/layouts/AuthLayout";
import HomuraInput from "@/components/ui/HomuraInput";
import HomuraButton from "@/components/ui/HomuraButton";
import { loginApi } from "@/api/auth";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

const loginSchema = z.object({
  email: z.string().email("Email khế ước không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải từ 6 ký tự trở lên"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data: any) => {
      const token = data?.access_token || data?.data?.access_token;
      if (token) {
        localStorage.setItem("accessToken", token);
      }
      router.push("/dashboard");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    mutation.mutate(data);
  };

  const getErrorMessage = () => {
    if (!mutation.error) return null;
    const error: any = mutation.error;
    if (error.response?.status === 401)
      return "Khế ước hoặc mật mã không chính xác!";
    if (error.response?.status === 403)
      return "Vòng lặp không ổn định (Lỗi XSRF). Hãy tải lại trang!";
    return "Mất kết nối với cõi mộng (Lỗi máy chủ).";
  };

  return (
    <AuthLayout>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <HourglassEmptyIcon
          sx={{ fontSize: 40, color: "primary.main", mb: 1 }}
        />
        <Typography component="h1" variant="h4" color="primary.light">
          HOMURA
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vòng lặp thời gian bắt đầu...
        </Typography>
      </Box>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, width: "100%" }}>
          {getErrorMessage()}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ width: "100%" }}
      >
        <HomuraInput
          label="Email (Khế ước)"
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <HomuraInput
          label="Mật mã"
          type={showPassword ? "text" : "password"}
          {...register("password")}
          error={!!errors.password}
          helperText={errors.password?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  sx={{ color: "text.secondary" }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <HomuraButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "ĐANG TIẾN VÀO VÒNG LẶP..." : "ĐĂNG NHẬP"}
        </HomuraButton>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Chưa nằm trong vòng lặp?{" "}
            <Link
              component={NextLink}
              href="/register"
              sx={{
                color: "primary.light",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Ký kết tại đây
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
}
