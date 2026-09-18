export const TASK_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "ARCHIVED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

// Strict chain: one step at a time. The dedicated /done endpoint is the only
// path allowed to jump PENDING|IN_PROGRESS -> DONE.
export const STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE"],
  DONE: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function nextStatuses(status: TaskStatus): readonly TaskStatus[] {
  return STATUS_TRANSITIONS[status];
}

// Archived tasks are terminal; DONE is handled separately (idempotent endpoint).
export function canBeMarkedDone(status: TaskStatus): boolean {
  return status === "PENDING" || status === "IN_PROGRESS";
}
