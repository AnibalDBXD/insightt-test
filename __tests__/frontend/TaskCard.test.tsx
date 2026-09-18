import "@/i18n";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TaskCard from "@/components/TaskCard";
import type { TaskDTO } from "@/lib/types";

jest.mock("@/lib/apiClient", () => ({
  ApiError: class ApiError extends Error {},
  apiFetch: jest.fn(),
  getToken: jest.fn(() => null),
}));

function makeTask(status: TaskDTO["status"]): TaskDTO {
  const now = new Date().toISOString();
  return {
    id: "task-1",
    userId: "u1",
    title: "Write tests",
    description: "Cover the core flows",
    status,
    doneAt: status === "DONE" ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

function renderCard(task: TaskDTO) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <TaskCard
        task={task}
        onError={() => {}}
        onDone={() => {}}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />
    </QueryClientProvider>
  );
}

describe("TaskCard", () => {
  it("renders title, status chip and actions for a pending task", () => {
    renderCard(makeTask("PENDING"));
    expect(screen.getByTestId("task-title")).toHaveTextContent("Write tests");
    expect(screen.getByTestId("task-status")).toHaveTextContent("Pending");
    expect(screen.getByTestId("mark-done")).toBeInTheDocument();
    expect(screen.getByTestId("status-select")).toBeInTheDocument();
  });

  it("hides mark-as-done for a DONE task (keeps archive move available)", () => {
    renderCard(makeTask("DONE"));
    expect(screen.queryByTestId("mark-done")).not.toBeInTheDocument();
    expect(screen.getByTestId("task-status")).toHaveTextContent("Done");
  });

  it("hides the status select for ARCHIVED tasks", () => {
    renderCard(makeTask("ARCHIVED"));
    expect(screen.queryByTestId("status-select")).not.toBeInTheDocument();
  });
});
