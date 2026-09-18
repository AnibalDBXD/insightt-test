import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import type { TaskDTO } from "@/lib/types";

export interface TaskInput {
  title: string;
  description?: string;
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["tasks"] });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<TaskDTO[]>("/api/tasks"),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: TaskInput) =>
      apiFetch<TaskDTO>("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useEditTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskInput> }) =>
      apiFetch<TaskDTO>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useMoveStatus() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch<TaskDTO>(`/api/tasks/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: invalidate,
  });
}

export function useMarkDone() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ task: TaskDTO; alreadyDone: boolean }>(`/api/tasks/${id}/done`, {
        method: "POST",
      }),
    onSuccess: invalidate,
  });
}
