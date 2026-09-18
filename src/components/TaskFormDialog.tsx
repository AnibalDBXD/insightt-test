import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Button,
  CircularProgress,
  type DialogProps,
} from "@mui/material";
import { taskCreateSchema, taskEditSchema } from "@/lib/validation/task.schema";
import type { TaskDTO } from "@/lib/types";
import type { TaskInput } from "@/hooks/useTasks";

interface Props {
  open: DialogProps["open"];
  onClose?: DialogProps["onClose"];
  initial?: TaskDTO;
  submitting?: boolean;
  onSubmit: (input: TaskInput) => void;
}

export default function TaskFormDialog({ initial, submitting, onSubmit, ...dialog }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const doneLocked = Boolean(initial && initial.status === "DONE");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: TaskInput = {
      title: title.trim(),
      ...(description.trim() || !doneLocked ? { description: description.trim() } : {}),
    };
    const schema = doneLocked
      ? taskEditSchema.required({ title: true }).omit({ description: true })
      : taskCreateSchema;
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_");
        (fieldErrors[key] ??= []).push(issue.message);
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(parsed.data as TaskInput);
  }

  return (
    <Dialog {...dialog} maxWidth="xs" fullWidth>
      <DialogTitle>
        {initial ? t("tasks.editTask") : t("tasks.createTask")}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack
          component="form"
          spacing={2}
          onSubmit={submit}
          noValidate
          data-testid="task-dialog"
        >
          <TextField
            label={t("tasks.titleField")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            fullWidth
            error={Boolean(errors.title)}
            helperText={errors.title?.map((m) => t(`validation.${m}`)).join(" ")}
            slotProps={{ htmlInput: { "data-testid": "task-title-input" } }}
          />
          <TextField
            label={t("tasks.descriptionOptional")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            disabled={doneLocked}
            helperText={doneLocked ? t("tasks.doneOnlyTitle") : undefined}
            error={Boolean(errors.description)}
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
