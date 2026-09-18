import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { registerSchema } from "@/lib/validation/auth.schema";

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

// Client-side only: the backend schema stays untouched.
const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "PASSWORD_MISMATCH",
  });

interface ConfirmForm {
  code: string;
}

const confirmCodeSchema = z.object({
  code: z.string().min(4, "REQUIRED").max(10, "CODE_INVALID"),
});

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string[]> | undefined>();

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
  });
  const confirmForm = useForm<ConfirmForm>({ resolver: zodResolver(confirmCodeSchema) });

  function showApiError(err: unknown) {
    const apiErr = err as ApiError;
    setError(t(`errors.${apiErr.code}`, { defaultValue: t("errors.INTERNAL_ERROR") }));
    setDetails(apiErr.details);
  }

  async function onRegister(data: RegisterForm) {
    setError(null);
    setDetails(undefined);
    setEmail(data.email);
    try {
      const res = await apiFetch<{ confirmed: boolean }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      if (res.confirmed) {
        await router.push({ pathname: "/login", query: { email: data.email } });
      } else {
        setStep("code");
      }
    } catch (err) {
      showApiError(err);
    }
  }

  async function onConfirm(data: ConfirmForm) {
    setError(null);
    setDetails(undefined);
    try {
      await apiFetch("/api/auth/confirm", {
        method: "POST",
        body: JSON.stringify({ email, code: data.code }),
      });
      await router.push({ pathname: "/login", query: { email } });
    } catch (err) {
      showApiError(err);
    }
  }

  const detailMessages = (key: string) =>
    details?.[key]?.map((msg) => t(`validation.${msg}`, { defaultValue: msg }));

  const { errors: registerErrors, isSubmitting: registering } = registerForm.formState;
  const { errors: confirmErrors, isSubmitting: confirming } = confirmForm.formState;

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

          {step === "form" ? (
            <Box component="form" onSubmit={registerForm.handleSubmit(onRegister)} noValidate>
              <Stack spacing={2}>
                <TextField
                  type="email"
                  label={t("auth.email")}
                  required
                  fullWidth
                  autoFocus
                  error={Boolean(registerErrors.email)}
                  helperText={
                    registerErrors.email
                      ? t(`validation.${registerErrors.email.message}`)
                      : undefined
                  }
                  {...registerForm.register("email")}
                />
                <TextField
                  type="password"
                  label={t("auth.password")}
                  required
                  fullWidth
                  error={Boolean(registerErrors.password)}
                  helperText={
                    registerErrors.password
                      ? t(`validation.${registerErrors.password.message}`)
                      : undefined
                  }
                  {...registerForm.register("password")}
                />
                <TextField
                  type="password"
                  label={t("auth.confirmPassword")}
                  required
                  fullWidth
                  error={Boolean(registerErrors.confirmPassword)}
                  helperText={
                    registerErrors.confirmPassword
                      ? t(`validation.${registerErrors.confirmPassword.message}`)
                      : undefined
                  }
                  {...registerForm.register("confirmPassword")}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={registering}
                  sx={{ mt: 1 }}
                >
                  {registering ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    t("auth.register")
                  )}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={confirmForm.handleSubmit(onConfirm)} noValidate>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  {t("auth.codePrompt", { email })}
                </Typography>
                <TextField
                  label={t("auth.code")}
                  required
                  fullWidth
                  autoFocus
                  error={Boolean(confirmErrors.code)}
                  helperText={
                    confirmErrors.code
                      ? t(`validation.${confirmErrors.code.message}`)
                      : undefined
                  }
                  slotProps={{
                    htmlInput: { inputMode: "numeric", "data-testid": "confirm-code" },
                  }}
                  {...confirmForm.register("code")}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={confirming}
                  sx={{ mt: 1 }}
                >
                  {confirming ? (
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
