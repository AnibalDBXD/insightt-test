/**
 * @jest-environment node
 */
jest.mock("@/lib/db", () => ({
  getTasksCollection: jest.fn(async () =>
    (require("./helpers") as typeof import("./helpers")).collection
  ),
}));
jest.mock("@/lib/auth", () => ({
  withAuth:
    (handler: (req: unknown, res: unknown, ctx: unknown) => unknown) =>
    (req: unknown, res: unknown) =>
      handler(req, res, { user: { sub: "owner-sub-1", email: "owner@test.dev" } }),
}));

import handler from "@/pages/api/tasks/[id]/status";
import { fakeReq, fakeRes, collection, resetCollection, TASK_ID, OWNER } from "./helpers";

function taskDoc(status: string) {
  return {
    _id: { toString: () => TASK_ID },
    userId: OWNER,
    title: "Ship the demo",
    status,
    doneAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

async function callStatus(from: string, to: string) {
  collection.findOne.mockResolvedValue(taskDoc(from));
  collection.findOneAndUpdate.mockResolvedValue(taskDoc(to));
  const res = fakeRes();
  await handler(fakeReq({ query: { id: TASK_ID }, body: { status: to } }), res);
  return res;
}

describe("POST /api/tasks/:id/status (state machine)", () => {
  beforeEach(resetCollection);

  it.each([
    ["PENDING", "IN_PROGRESS"],
    ["IN_PROGRESS", "DONE"],
    ["DONE", "ARCHIVED"],
  ])("allows %s -> %s", async (from, to) => {
    const res = await callStatus(from, to);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe(to);
  });

  it.each([
    ["PENDING", "DONE"],
    ["PENDING", "ARCHIVED"],
    ["IN_PROGRESS", "PENDING"],
    ["DONE", "IN_PROGRESS"],
    ["ARCHIVED", "DONE"],
  ])("rejects invalid transition %s -> %s", async (from, to) => {
    const res = await callStatus(from, to);
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("moving to the current status is a no-op", async () => {
    const res = await callStatus("PENDING", "PENDING");
    expect(res.statusCode).toBe(200);
  });

  it("rejects the move when another request changed the status concurrently", async () => {
    collection.findOne.mockResolvedValue(taskDoc("PENDING"));
    // The atomic guard sees a different status: the flip did not happen.
    collection.findOneAndUpdate.mockResolvedValue(null);
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID }, body: { status: "IN_PROGRESS" } }), res);
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("forbids moving someone else's task", async () => {
    collection.findOne.mockResolvedValue({ ...taskDoc("PENDING"), userId: "intruder" });
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID }, body: { status: "IN_PROGRESS" } }), res);
    expect(res.statusCode).toBe(403);
  });

  it("validates the body", async () => {
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID }, body: { status: "WHATEVER" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
