import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  InputAdornment,
  IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { apiFetch, ApiError, saveSession } from "@/lib/apiClient";
import { loginSchema, type AuthInput } from "@/lib/validation/auth.schema";

interface LoginResponse {
  accessToken: string;
  user: { email: string };
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string[]> | undefined>();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: fieldErrors, isSubmitting },
  } = useForm<AuthInput>({ resolver: zodResolver(loginSchema) });

  // Prefill email when redirected from registration (?email=...).
  const prefill = typeof router.query.email === "string" ? router.query.email : "";
  const [lastPrefill, setLastPrefill] = useState("");
  if (prefill !== lastPrefill) {
    setLastPrefill(prefill);
    if (prefill) setValue("email", prefill);
  }

  async function onValid(data: AuthInput) {
    setError(null);
    setDetails(undefined);
    try {
      const res = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      saveSession(res.accessToken, res.user.email);
      await router.replace("/tasks");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(t(`errors.${apiErr.code}`, { defaultValue: t("errors.INTERNAL_ERROR") }));
      setDetails(apiErr.details);
    }
  }

  const detailMessages = (key: string) =>
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
              {detailMessages("email")?.map((msg) => (
                <Typography key={msg} variant="caption" sx={{ display: "block" }}>
                  {t("auth.email")}: {msg}
                </Typography>
              ))}
              {detailMessages("password")?.map((msg) => (
                <Typography key={msg} variant="caption" sx={{ display: "block" }}>
                  {t("auth.password")}: {msg}
                </Typography>
              ))}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onValid)} noValidate>
            <Stack spacing={2}>
              <TextField
                type="email"
                label={t("auth.email")}
                required
                fullWidth
                autoFocus
                error={Boolean(fieldErrors.email)}
                helperText={
                  fieldErrors.email ? t(`validation.${fieldErrors.email.message}`) : undefined
                }
                {...register("email")}
              />
              <TextField
                type={showPassword ? "text" : "password"}
                label={t("auth.password")}
                required
                fullWidth
                error={Boolean(fieldErrors.password)}
                helperText={
                  fieldErrors.password
                    ? t(`validation.${fieldErrors.password.message}`)
                    : undefined
                }
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={
                            showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                          }
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("password")}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{ mt: 1 }}
              >
                {isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  t("auth.login")
                )}
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
