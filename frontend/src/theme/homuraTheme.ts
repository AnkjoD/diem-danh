import { createTheme } from "@mui/material/styles";

export const homuraTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#7B1FA2",
      light: "#E1BEE7",
      dark: "#4A148C",
    },
    secondary: {
      main: "#8A0303",
      light: "#D32F2F",
    },
    background: {
      default: "#0B0914",
      paper: "#1A1625",
    },
    text: {
      primary: "#F3E5F5",
      secondary: "#BDBDBD",
    },
  },
  typography: {
    fontFamily: "var(--font-inter), sans-serif",
    h4: {
      fontFamily: "var(--font-playfair), serif",
      fontWeight: 700,
      letterSpacing: "0.05em",
    },
    button: {
      fontWeight: 600,
      letterSpacing: "0.05em",
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: "24px",
        },
      },
    },
  },
});
