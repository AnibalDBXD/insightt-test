import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  CircularProgress,
} from "@mui/material";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { apiFetch, ApiError } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string[]> | undefined>();
  const [loading, setLoading] = useState(false);

  const prefill = typeof router.query.email === "string" ? router.query.email : "";

  const [lastPrefill, setLastPrefill] = useState("");
  if (prefill !== lastPrefill) {
    setLastPrefill(prefill);
    if (prefill) setEmail(prefill);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDetails(undefined);
    try {
      const res = await apiFetch<{ accessToken: string; user: { email: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      localStorage.setItem("auth.accessToken", res.accessToken);
      localStorage.setItem("auth.email", res.user.email);
      await router.replace("/tasks");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(t(`errors.${apiErr.code}`, { defaultValue: t("errors.INTERNAL_ERROR") }));
      setDetails(apiErr.details);
    } finally {
      setLoading(false);
    }
  }

  const fieldErrors = (key: string) =>
    details?.[key]?.map((msg) => t(`validation.${msg}`, { defaultValue: msg }));

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Head>
        <title>Task App — Sign in</title>
      </Head>
      <Stack direction="row" sx={{ position: "fixed", top: 16, right: 16 }}>
        <LanguageSwitcher />
      </Stack>
      <Card sx={{ width: "100%", maxWidth: 400 }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            {t("auth.loginTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t("auth.loginSubtitle")}
          </Typography>

          {error && (
            <Alert role="alert" severity="error" sx={{ mb: 2 }}>
              {error}
              {fieldErrors("email")?.map((msg) => (
                <Typography key={msg} variant="caption" sx={{ display: "block" }}>
                  {t("auth.email")}: {msg}
                </Typography>
              ))}
              {fieldErrors("password")?.map((msg) => (
                <Typography key={msg} variant="caption" sx={{ display: "block" }}>
                  {t("auth.password")}: {msg}
                </Typography>
              ))}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                type="email"
                label={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoFocus
                error={Boolean(fieldErrors("email"))}
                helperText={fieldErrors("email")?.[0]}
              />
              <TextField
                type="password"
                label={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : t("auth.login")}
              </Button>
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", mt: 3 }}>
            <Typography color="text.secondary">{t("auth.noAccount")}</Typography>
            <Link href="/register" underline="hover" color="primary">
              {t("auth.signUpLink")}
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
