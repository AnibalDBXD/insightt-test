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

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string[]> | undefined>();
  const [loading, setLoading] = useState(false);

  async function onError(err: unknown) {
    const apiErr = err as ApiError;
    setError(t(`errors.${apiErr.code}`, { defaultValue: t("errors.INTERNAL_ERROR") }));
    setDetails(apiErr.details);
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDetails(undefined);
    if (password !== confirm) {
      setError(t("errors.PASSWORD_MISMATCH"));
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ confirmed: boolean }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.confirmed) {
        await router.push({ pathname: "/login", query: { email } });
      } else {
        setStep("code");
      }
    } catch (err) {
      await onError(err);
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDetails(undefined);
    setLoading(true);
    try {
      await apiFetch("/api/auth/confirm", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      await router.push({ pathname: "/login", query: { email } });
    } catch (err) {
      await onError(err);
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
        <title>Task App — Sign up</title>
      </Head>
      <Stack direction="row" sx={{ position: "fixed", top: 16, right: 16 }}>
        <LanguageSwitcher />
      </Stack>
      <Card sx={{ width: "100%", maxWidth: 400 }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            {t("auth.registerTitle")}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {t("auth.registerSubtitle")}
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

          {step === "form" ? (
            <Box component="form" onSubmit={onRegister} noValidate>
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
                  error={Boolean(fieldErrors("password"))}
                  helperText={fieldErrors("password")?.[0]}
                />
                <TextField
                  type="password"
                  label={t("auth.confirmPassword")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
                  {loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    t("auth.register")
                  )}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={onConfirm} noValidate>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  {t("auth.codePrompt", { email })}
                </Typography>
                <TextField
                  label={t("auth.code")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  slotProps={{
                    htmlInput: { inputMode: "numeric", "data-testid": "confirm-code" },
                  }}
                />
                <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
                  {loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    t("auth.confirm")
                  )}
                </Button>
              </Stack>
            </Box>
          )}

          <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", mt: 3 }}>
            <Typography color="text.secondary">{t("auth.haveAccount")}</Typography>
            <Link href="/login" underline="hover" color="primary">
              {t("auth.signInLink")}
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
