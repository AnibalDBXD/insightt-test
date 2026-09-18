import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#3452B2" },
    secondary: { main: "#8134AF" },
  },
  shape: { borderRadius: 8 },
  components: {
    // Concentric radii: card 24 = input 8 + card padding 16.
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: "0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px rgb(0 0 0 / 0.08)",
        },
      },
    },
    // Tactile press feedback at 0.96.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          transition: "transform 150ms cubic-bezier(0.2, 0, 0, 1), background-color 150ms, color 150ms",
          "&:active": { transform: "scale(0.96)" },
        },
      },
    },
  },
});

export default theme;
