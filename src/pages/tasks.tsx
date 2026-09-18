import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LogoutIcon from "@mui/icons-material/Logout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TaskCard from "@/components/TaskCard";
import TaskFormDialog from "@/components/TaskFormDialog";
import { useCreateTask, useTasks } from "@/hooks/useTasks";
import { clearSession, getSessionEmail, getToken, ApiError } from "@/lib/apiClient";
import { TASK_STATUSES, type TaskStatus } from "@/lib/taskState";

export default function TasksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(
    null
  );

  const { data: tasks, isLoading, error } = useTasks();
  const createTask = useCreateTask();

  // Client-side route guard.
  useEffect(() => {
    if (!getToken()) void router.replace("/login");
  }, [router]);

  // Session expired while on the board.
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      clearSession();
      void router.replace("/login");
    }
  }, [error, router]);

  function onError(err: unknown) {
    const code = err instanceof ApiError ? err.code : "INTERNAL_ERROR";
    setToast({ message: t(`errors.${code}`, { defaultValue: t("errors.INTERNAL_ERROR") }), severity: "error" });
  }

  function logout() {
    clearSession();
    void router.replace("/login");
  }

  if (!getToken() || (isLoading && !error)) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Head>
        <title>Task App</title>
      </Head>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            Task App
          </Typography>
          <LanguageSwitcher sx={{ mr: 1, bgcolor: "transparent" }} />
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1, display: { xs: "none", sm: "block" } }}>
            {getSessionEmail()}
          </Typography>
          <IconButton aria-label={t("common.logout")} data-testid="logout" onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            {t("tasks.boardTitle")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            data-testid="new-task"
            onClick={() => setCreateOpen(true)}
          >
            {t("tasks.newTask")}
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            alignItems: "start",
          }}
        >
          {TASK_STATUSES.map((status: TaskStatus) => {
            const columnTasks = (tasks ?? []).filter((task) => task.status === status);
            return (
              <Box key={status}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1, px: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {t(`tasks.statuses.${status}`)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {columnTasks.length}
                  </Typography>
                </Stack>
                <Stack spacing={1.5}>
                  {columnTasks.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ px: 1 }} data-testid="empty-column">
                      {t("tasks.emptyList")}
                    </Typography>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onError={onError}
                        onDone={(alreadyDone) =>
                          setToast({
                            message: alreadyDone
                              ? t("tasks.alreadyDone")
                              : t("tasks.taskDone"),
                            severity: "success",
                          })
                        }
                        onUpdated={() => setToast({ message: t("tasks.taskUpdated"), severity: "success" })}
                        onDeleted={() => setToast({ message: t("tasks.taskDeleted"), severity: "success" })}
                      />
                    ))
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Container>

      <TaskFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        submitting={createTask.isPending}
        onSubmit={(input) =>
          createTask.mutate(input, {
            onError,
            onSuccess: () => {
              setCreateOpen(false);
              setToast({ message: t("tasks.taskCreated"), severity: "success" });
            },
          })
        }
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          role="status"
          severity={toast?.severity ?? "success"}
          variant="filled"
          onClose={() => setToast(null)}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
