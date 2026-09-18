import type { AppProps } from "next/app";
import { useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AppCacheProvider } from "@mui/material-nextjs/v16-pagesRouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import theme from "@/styles/theme";
import "@/i18n";

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
  );
  return (
    <AppCacheProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Component {...pageProps} />
        </ThemeProvider>
      </QueryClientProvider>
    </AppCacheProvider>
  );
}
