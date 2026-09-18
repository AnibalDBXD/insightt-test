/**
 * @jest-environment node
 */
import { canBeMarkedDone, canTransition, nextStatuses } from "@/lib/taskState";

describe("task status state machine", () => {
  it("allows valid single steps", () => {
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "DONE")).toBe(true);
    expect(canTransition("DONE", "ARCHIVED")).toBe(true);
  });

  it("rejects backward moves and skipped steps", () => {
    expect(canTransition("PENDING", "DONE")).toBe(false);
    expect(canTransition("PENDING", "ARCHIVED")).toBe(false);
    expect(canTransition("IN_PROGRESS", "PENDING")).toBe(false);
    expect(canTransition("DONE", "IN_PROGRESS")).toBe(false);
    expect(canTransition("ARCHIVED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("DONE", "PENDING")).toBe(false);
  });

  it("offers only valid next statuses", () => {
    expect(nextStatuses("PENDING")).toEqual(["IN_PROGRESS"]);
    expect(nextStatuses("IN_PROGRESS")).toEqual(["DONE"]);
    expect(nextStatuses("DONE")).toEqual(["ARCHIVED"]);
    expect(nextStatuses("ARCHIVED")).toEqual([]);
  });

  it("allows mark-as-done only from PENDING or IN_PROGRESS", () => {
    expect(canBeMarkedDone("PENDING")).toBe(true);
    expect(canBeMarkedDone("IN_PROGRESS")).toBe(true);
    expect(canBeMarkedDone("DONE")).toBe(false);
    expect(canBeMarkedDone("ARCHIVED")).toBe(false);
  });
});
