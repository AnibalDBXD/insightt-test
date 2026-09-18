import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#4F46E5" },
    secondary: { main: "#7C3AED" },
    background: { default: "#F6F7FB", paper: "#FFFFFF" },
  },
  typography: {
    h4: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 8 },
  components: {
    // Concentric radii: card 24 = input 8 + card padding 16.
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow:
            "0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.06)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    // Tactile press feedback at 0.96.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          transition:
            "transform 150ms cubic-bezier(0.2, 0, 0, 1), background-color 150ms, color 150ms",
          "&:active": { transform: "scale(0.96)" },
        },
      },
    },
  },
});

export default theme;
