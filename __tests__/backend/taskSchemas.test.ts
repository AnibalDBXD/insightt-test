/**
 * @jest-environment node
 */
import {
  taskCreateSchema,
  taskEditSchema,
  taskStatusSchema,
} from "@/lib/validation/task.schema";
import { registerSchema } from "@/lib/validation/auth.schema";

describe("task schemas (Zod, shared by backend and frontend)", () => {
  it("accepts a valid create payload", () => {
    const result = taskCreateSchema.safeParse({ title: "Buy milk" });
    expect(result.success).toBe(true);
  });

  it("accepts an optional description", () => {
    const result = taskCreateSchema.safeParse({
      title: "Buy milk",
      description: "Two liters",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(taskCreateSchema.safeParse({ title: "" }).success).toBe(false);
    expect(taskCreateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an overlong title", () => {
    expect(taskCreateSchema.safeParse({ title: "a".repeat(101) }).success).toBe(false);
  });

  it("rejects an overlong description", () => {
    expect(
      taskCreateSchema.safeParse({ title: "x", description: "a".repeat(501) }).success
    ).toBe(false);
  });

  it("edit schema allows partial updates", () => {
    expect(taskEditSchema.safeParse({}).success).toBe(true);
    expect(taskEditSchema.safeParse({ title: "New" }).success).toBe(true);
  });

  it("status schema only accepts known statuses", () => {
    expect(taskStatusSchema.safeParse({ status: "PENDING" }).success).toBe(true);
    expect(taskStatusSchema.safeParse({ status: "DONE" }).success).toBe(true);
    expect(taskStatusSchema.safeParse({ status: "COMPLETED" }).success).toBe(false);
    expect(taskStatusSchema.safeParse({ status: "pending" }).success).toBe(false);
  });
});

describe("auth schema", () => {
  it("accepts valid credentials", () => {
    expect(
      registerSchema.safeParse({ email: "a@b.com", password: "12345678" }).success
    ).toBe(true);
  });

  it("rejects bad email and short password", () => {
    expect(
      registerSchema.safeParse({ email: "not-an-email", password: "12345678" }).success
    ).toBe(false);
    expect(
      registerSchema.safeParse({ email: "a@b.com", password: "1234567" }).success
    ).toBe(false);
  });
});
