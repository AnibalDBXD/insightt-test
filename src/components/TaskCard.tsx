import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDraggable } from "@dnd-kit/core";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import type { TaskDTO } from "@/lib/types";
import { STATUS_COLORS } from "@/styles/statusColors";
import { getSessionEmail } from "@/lib/apiClient";
import {
  useDeleteTask,
  useEditTask,
  useMarkDone,
  type TaskInput,
} from "@/hooks/useTasks";
import TaskFormDialog from "./TaskFormDialog";

interface Props {
  task: TaskDTO;
  onError: (err: unknown) => void;
  onDone: (alreadyDone: boolean) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function TaskCard({ task, onError, onDone, onUpdated, onDeleted }: Props) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const markDone = useMarkDone();
  const deleteTask = useDeleteTask();
  const editTask = useEditTask();

  const color = STATUS_COLORS[task.status];
  const owner = task.ownerEmail ?? getSessionEmail() ?? "—";
  const initial = (owner[0] || "?").toUpperCase();

  // Drag handle on the card root; the 8px activation distance keeps clicks
  // on the buttons untouched. Dropping into a column performs the move.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  const busy = markDone.isPending || deleteTask.isPending;

  function handleEdit(input: TaskInput) {
    editTask.mutate(
      { id: task.id, input },
      {
        onError,
        onSuccess: () => {
          onUpdated();
          setDialogOpen(false);
        },
      }
    );
  }

  return (
    <Card
      ref={setNodeRef}
      data-testid="task-item"
      data-task-id={task.id}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.55 : 1,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      sx={{
        transition: "box-shadow 150ms ease-out, opacity 150ms ease-out",
        "&:hover": {
          boxShadow: "0 2px 4px rgb(15 23 42 / 0.05), 0 8px 24px rgb(15 23 42 / 0.10)",
        },
        zIndex: isDragging ? 10 : undefined,
      }}
      {...listeners}
      {...attributes}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
          <Chip
            size="small"
            label={t(`tasks.statuses.${task.status}`)}
            data-testid="task-status"
            sx={{
              bgcolor: `${color}1F`,
              color,
              fontWeight: 600,
              border: `1px solid ${color}33`,
            }}
          />
          <Typography
            variant="subtitle1"
            data-testid="task-title"
            sx={{ fontWeight: 500, flexGrow: 1, minWidth: 0, overflowWrap: "anywhere" }}
          >
            {task.title}
          </Typography>
        </Stack>

        {task.description && (
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
            {task.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1.5 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: `${color}1F`,
              color,
            }}
          >
            {initial}
          </Avatar>
          <Typography
            variant="caption"
            color="text.secondary"
            data-testid="task-owner"
            sx={{ minWidth: 0, overflowWrap: "anywhere" }}
          >
            {t("tasks.owner", { owner })}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", mt: 1.5, justifyContent: "flex-end" }}
        >
          {task.status !== "DONE" && task.status !== "ARCHIVED" && (
            <Tooltip title={t("tasks.markDone")}>
              <Button
                size="small"
                variant="outlined"
                color="success"
                disabled={busy}
                data-testid="mark-done"
                startIcon={<CheckIcon />}
                onClick={() =>
                  markDone.mutate(task.id, {
                    onError,
                    onSuccess: (res) => onDone(res.alreadyDone),
                  })
                }
              >
                {t("tasks.statuses.DONE")}
              </Button>
            </Tooltip>
          )}
          <Tooltip title={t("tasks.editTask")}>
            <IconButton
              aria-label={t("tasks.editTask")}
              data-testid="edit-task"
              disabled={busy}
              onClick={() => setDialogOpen(true)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("tasks.deleteTask")}>
            <IconButton
              aria-label={t("tasks.deleteTask")}
              data-testid="delete-task"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardContent>

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={task}
        submitting={editTask.isPending}
        onSubmit={handleEdit}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>{t("tasks.deleteConfirmTitle")}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t("tasks.deleteConfirmText", { title: task.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            data-testid="confirm-delete"
            disabled={deleteTask.isPending}
            onClick={() =>
              deleteTask.mutate(task.id, {
                onError,
                onSuccess: () => {
                  setConfirmOpen(false);
                  onDeleted();
                },
              })
            }
          >
            {t("tasks.deleteTask")}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
