import type { TaskDTO } from "./types";
import type { TaskStatus } from "./taskState";

export function toDTO(doc: Record<string, unknown> & { _id: unknown }): TaskDTO {
  return {
    id: String(doc._id),
    userId: doc.userId as string,
    title: doc.title as string,
    description: doc.description as string | undefined,
    status: doc.status as TaskStatus,
    doneAt: doc.doneAt ? (doc.doneAt as Date).toISOString() : null,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}
