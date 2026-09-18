import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  TextField,
  Button,
  CircularProgress,
  type DialogProps,
} from "@mui/material";
import { taskCreateSchema, taskEditSchema } from "@/lib/validation/task.schema";
import type { TaskDTO } from "@/lib/types";
import type { TaskInput } from "@/hooks/useTasks";
import { getSessionEmail } from "@/lib/apiClient";

interface Props {
  open: boolean;
  onClose?: DialogProps["onClose"];
  initial?: TaskDTO;
  submitting?: boolean;
  onSubmit: (input: TaskInput) => void;
}

export default function TaskFormDialog({ open, initial, submitting, onSubmit, ...dialog }: Props) {
  const { t } = useTranslation();

  const doneLocked = Boolean(initial && initial.status === "DONE");

  const schema = useMemo(
    () =>
      doneLocked
        ? taskEditSchema.required({ title: true }).omit({ description: true })
        : taskCreateSchema,
    [doneLocked]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskInput>({
    resolver: zodResolver(schema) as Resolver<TaskInput>,
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
    },
  });

  // Fresh form on every open: edits prefill their task, create starts empty.
  const taskId = initial?.id;
  useEffect(() => {
    if (open) {
      reset({ title: initial?.title ?? "", description: initial?.description ?? "" });
    } else {
      reset({ title: "", description: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId, reset]);

  function submit(data: TaskInput) {
    onSubmit({
      title: data.title.trim(),
      ...(doneLocked ? {} : { description: data.description?.trim() || undefined }),
    });
  }

  const fieldError = (key: "title" | "description") =>
    errors[key] ? t(`validation.${errors[key]?.message}`) : undefined;

  return (
    <Dialog {...dialog} open={open} maxWidth="xs" fullWidth>
      <DialogTitle>{initial ? t("tasks.editTask") : t("tasks.createTask")}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
          data-testid="dialog-owner"
        >
          {initial
            ? t("tasks.owner", { owner: initial.ownerEmail ?? getSessionEmail() ?? "—" })
            : t("tasks.creatingAs", { email: getSessionEmail() ?? "—" })}
        </Typography>
        <Stack
          component="form"
          spacing={2}
          onSubmit={handleSubmit(submit)}
          noValidate
          data-testid="task-dialog"
        >
          <TextField
            label={t("tasks.titleField")}
            required
            autoFocus
            fullWidth
            error={Boolean(errors.title)}
            helperText={fieldError("title")}
            slotProps={{ htmlInput: { "data-testid": "task-title-input" } }}
            {...register("title")}
          />
          <TextField
            label={t("tasks.descriptionOptional")}
            fullWidth
            multiline
            minRows={2}
            disabled={doneLocked}
            helperText={doneLocked ? t("tasks.doneOnlyTitle") : fieldError("description")}
            error={Boolean(errors.description)}
            {...register("description")}
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", mt: 1 }}>
            <Button onClick={() => dialog.onClose?.(new Event("cancel"), "escapeKeyDown")}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={20} color="inherit" /> : null}
              {initial ? t("tasks.editTask") : t("tasks.createTask")}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
