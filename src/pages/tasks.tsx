import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
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
import {
  useCreateTask,
  useMarkDone,
  useMoveStatus,
  useTasks,
} from "@/hooks/useTasks";
import { clearSession, getSessionEmail, getToken, ApiError } from "@/lib/apiClient";
import { TASK_STATUSES, type TaskStatus } from "@/lib/taskState";
import { STATUS_COLORS } from "@/styles/statusColors";
import theme from "@/styles/theme";

export default function TasksPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(
    null
  );

  const { data: tasks, isLoading, error } = useTasks();
  const createTask = useCreateTask();
  const moveStatus = useMoveStatus();
  const markDone = useMarkDone();

  const sensors = useSensors(
    // 8px activation keeps card clicks (buttons, select) separate from drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // The board reads localStorage (token, email) during render — render the
  // spinner during hydration too, so the first client render matches the
  // server HTML. useSyncExternalStore re-renders once hydration is done.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

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

  // Drops into DONE use the idempotent mark-done endpoint; every other move
  // goes through the state machine, which rejects invalid transitions.
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const targetStatus = over.id as TaskStatus;
    const task = tasks?.find((item) => item.id === active.id);
    if (!task || task.status === targetStatus) return;
    if (targetStatus === "DONE") {
      markDone.mutate(task.id, {
        onError,
        onSuccess: (res) =>
          setToast({
            message: res.alreadyDone ? t("tasks.alreadyDone") : t("tasks.taskDone"),
            severity: "success",
          }),
      });
    } else {
      moveStatus.mutate(
        { id: task.id, status: targetStatus },
        {
          onError,
          onSuccess: () => setToast({ message: t("tasks.taskUpdated"), severity: "success" }),
        }
      );
    }
  }

  if (!hydrated || !getToken() || (isLoading && !error)) {
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
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: "#fff",
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Task App
          </Typography>
          <LanguageSwitcher
            sx={{
              mr: 1,
              bgcolor: "rgb(255 255 255 / 0.22)",
              "& .MuiSelect-select": { color: "#fff" },
              "& .MuiSelect-icon": { color: "#fff" },
            }}
          />
          <Typography
            variant="body2"
            sx={{ mr: 1, display: { xs: "none", sm: "block" }, color: "rgb(255 255 255 / 0.85)" }}
          >
            {getSessionEmail()}
          </Typography>
          <IconButton
            aria-label={t("common.logout")}
            data-testid="logout"
            onClick={logout}
            sx={{ color: "#fff" }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}
        >
          <Typography variant="h4" component="h1">
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

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              alignItems: "start",
            }}
          >
            {TASK_STATUSES.map((status: TaskStatus) => (
              <StatusColumn
                key={status}
                status={status}
                tasks={tasks ?? []}
                onError={onError}
                onDone={(alreadyDone) =>
                  setToast({
                    message: alreadyDone ? t("tasks.alreadyDone") : t("tasks.taskDone"),
                    severity: "success",
                  })
                }
                onUpdated={() => setToast({ message: t("tasks.taskUpdated"), severity: "success" })}
                onDeleted={() => setToast({ message: t("tasks.taskDeleted"), severity: "success" })}
              />
            ))}
          </Box>
        </DndContext>
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

function StatusColumn(props: {
  status: TaskStatus;
  tasks: Awaited<ReturnType<typeof useTasks>["data"]>;
  onError: (err: unknown) => void;
  onDone: (alreadyDone: boolean) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const { status, tasks, onError, onDone, onUpdated, onDeleted } = props;
  const { t } = useTranslation();
  const color = STATUS_COLORS[status];
  const columnTasks = (tasks ?? []).filter((task) => task.status === status);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        borderRadius: 6,
        p: 1.5,
        bgcolor: `${color}0D`,
        borderColor: isOver ? color : `${color}2E`,
        borderStyle: isOver ? "dashed" : "solid",
        transition: "border-color 150ms ease-out, background-color 150ms ease-out",
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5, px: 0.5 }}>
        <Box
          sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
          aria-hidden
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t(`tasks.statuses.${status}`)}
        </Typography>
        <Chip
          size="small"
          label={columnTasks.length}
          sx={{ ml: "auto", height: 20, fontWeight: 600, bgcolor: `${color}1F`, color }}
        />
      </Stack>

      <Stack spacing={1.5}>
        {columnTasks.length === 0 ? (
          <Box
            data-testid="empty-column"
            sx={{
              border: `2px dashed ${color}40`,
              borderRadius: 3,
              p: 2,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.disabled">
              {t("tasks.emptyList")}
            </Typography>
          </Box>
        ) : (
          columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onError={onError}
              onDone={onDone}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))
        )}
      </Stack>
    </Paper>
  );
}

function subscribeNoop() {
  return () => {};
}
