"use client";
import { Paper, Box, Typography } from "@mui/material";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthCard = ({ title, subtitle, children }: AuthCardProps) => (
  <Paper
    elevation={24}
    sx={{
      p: 5,
      width: "100%",
      maxWidth: 420,
      background: "rgba(22, 17, 29, 0.8)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(156, 39, 176, 0.3)",
    }}
  >
    <Box textAlign="center" mb={4}>
      <Typography variant="h4" color="primary.light">
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", fontStyle: "italic" }}
      >
        {subtitle}
      </Typography>
    </Box>
    {children}
  </Paper>
);
