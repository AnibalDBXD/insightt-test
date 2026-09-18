import type { TaskStatus } from "@/lib/taskState";

// One color per status — used by chips, column tints, dots and accents.
export const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: "#F59E0B",
  IN_PROGRESS: "#3B82F6",
  DONE: "#10B981",
  ARCHIVED: "#94A3B8",
};
