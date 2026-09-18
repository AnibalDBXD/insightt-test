import { z } from "zod";
import { TASK_STATUSES } from "../taskState";

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "REQUIRED").max(100, "TITLE_TOO_LONG"),
  description: z.string().trim().max(500, "DESCRIPTION_TOO_LONG").optional(),
});

export const taskEditSchema = z.object({
  title: z.string().trim().min(1, "REQUIRED").max(100, "TITLE_TOO_LONG").optional(),
  description: z.string().trim().max(500, "DESCRIPTION_TOO_LONG").optional(),
});

export const taskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskEditInput = z.infer<typeof taskEditSchema>;
