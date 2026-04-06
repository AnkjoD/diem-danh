"use client"

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        height: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'rgba(26,14,36,1)'
      }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
