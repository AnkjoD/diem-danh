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
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import AuthLayout from "@/components/layouts/AuthLayout";
import HomuraInput from "@/components/ui/HomuraInput";
import HomuraButton from "@/components/ui/HomuraButton";
import { useRouter } from "next/navigation";
import { registerApi } from "@/api/auth";
import { useMutation } from "@tanstack/react-query";

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Tên định danh phải có ít nhất 2 ký tự"),
    email: z.string().email("Email khế ước không hợp lệ"),
    password: z.string().min(6, "Mật khẩu ma thuật phải từ 6 ký tự trở lên"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp nhau!",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: registerApi,
    onSuccess: (data) => {
      console.log("Thành công: ", data);
      router.push("/");
    },
    onError: (error) => {
      console.error("Lỗi: ", error);
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormValues) => {
    mutation.mutate(data);
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
        <AutoAwesomeIcon
          sx={{ fontSize: 40, color: "secondary.main", mb: 1 }}
        />
        <Typography
          component="h1"
          variant="h4"
          color="primary.light"
          align="center"
        >
          KÝ KẾT KHẾ ƯỚC
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ width: "100%" }}
      >
        <HomuraInput
          label="Tên định danh"
          {...register("full_name")}
          error={!!errors.full_name}
          helperText={errors.full_name?.message}
        />

        <HomuraInput
          label="Email (Khế ước)"
          {...register("email")}
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <HomuraInput
          label="Mật khẩu ma thuật"
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

        <HomuraInput
          label="Xác nhận mật khẩu"
          type={showPassword ? "text" : "password"}
          {...register("confirmPassword")}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
        />

        <HomuraButton type="submit" color="secondary">
          XÁC NHẬN TRỞ THÀNH NGƯỜI DÙNG
        </HomuraButton>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Đã nằm trong vòng lặp thời gian?{" "}
            <Link
              component={NextLink}
              href="/login"
              sx={{
                color: "primary.light",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Quay lại đây
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
}
