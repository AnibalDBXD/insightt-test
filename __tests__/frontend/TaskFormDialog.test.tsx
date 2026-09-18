import "@/i18n";
import { fireEvent, screen, render } from "@testing-library/react";
import TaskFormDialog from "@/components/TaskFormDialog";

describe("TaskFormDialog", () => {
  it("renders create form", () => {
    render(<TaskFormDialog open onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create task/i })).toBeInTheDocument();
  });

  it("requires a title", () => {
    render(<TaskFormDialog open onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Create task/i }));
    expect(screen.getByText(/This field is required/i)).toBeInTheDocument();
  });

  it("submits trimmed values", () => {
    const onSubmit = jest.fn();
    render(<TaskFormDialog open onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "  Buy milk  " },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Two liters" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create task/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Buy milk",
      description: "Two liters",
    });
  });

  it("rejects an overlong title", () => {
    render(<TaskFormDialog open onSubmit={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: "a".repeat(101) },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create task/i }));
    expect(screen.getByText(/At most 100 characters/i)).toBeInTheDocument();
  });

  it("locks description for DONE tasks and keeps title editable", () => {
    render(
      <TaskFormDialog
        open
        initial={{
          id: "1",
          userId: "u1",
          title: "Done task",
          status: "DONE",
          doneAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        onSubmit={jest.fn()}
      />
    );
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByText(/Completed tasks can only have their title fixed/i)).toBeInTheDocument();
  });
});
