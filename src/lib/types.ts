import type { TaskStatus } from "./taskState";

export interface TaskDTO {
  id: string;
  userId: string;
  ownerEmail?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}
