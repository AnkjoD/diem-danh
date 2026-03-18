import { Box, Container, Paper, ThemeProvider } from "@mui/material";
import { homuraTheme } from "@/theme/homuraTheme";
import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={homuraTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 0%, #2A1B38 0%, #0B0914 85%)",
          px: 2,
        }}
      >
        <Container maxWidth="xs" disableGutters>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 4, sm: 6 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "rgba(26, 22, 37, 0.7)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(123, 31, 162, 0.15)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
            }}
          >
            {children}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
