/**
 * @jest-environment node
 */
import handler from "@/pages/api/tasks/[id]/status";
import { fakeReq, fakeRes, collection as mockCollection, resetCollection, TASK_ID, OWNER } from "./helpers";

jest.mock("@/lib/db", () => ({
  getTasksCollection: () => Promise.resolve(mockCollection),
}));
jest.mock("@/lib/auth", () => ({
  withAuth:
    (handler: (req: unknown, res: unknown, ctx: unknown) => unknown) =>
    (req: unknown, res: unknown) =>
      handler(req, res, { user: { sub: "owner-sub-1", email: "owner@test.dev" } }),
}));

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
  mockCollection.findOne.mockResolvedValue(taskDoc(from));
  mockCollection.findOneAndUpdate.mockResolvedValue(taskDoc(to));
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
    expect(res.body.error?.code).toBe("INVALID_TRANSITION");
    expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("moving to the current status is a no-op", async () => {
    const res = await callStatus("PENDING", "PENDING");
    expect(res.statusCode).toBe(200);
  });

  it("rejects the move when another request changed the status concurrently", async () => {
    mockCollection.findOne.mockResolvedValue(taskDoc("PENDING"));
    // The atomic guard sees a different status: the flip did not happen.
    mockCollection.findOneAndUpdate.mockResolvedValue(null);
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID }, body: { status: "IN_PROGRESS" } }), res);
    expect(res.statusCode).toBe(409);
    expect(res.body.error?.code).toBe("INVALID_TRANSITION");
  });

  it("moves a task owned by another user (shared board)", async () => {
    mockCollection.findOne.mockResolvedValue({ ...taskDoc("PENDING"), userId: "someone-else" });
    mockCollection.findOneAndUpdate.mockResolvedValue(taskDoc("IN_PROGRESS"));
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID }, body: { status: "IN_PROGRESS" } }), res);
    expect(res.statusCode).toBe(200);
  });

  it("forbids a non-owner moving a task to DONE", async () => {
    mockCollection.findOne.mockResolvedValue({ ...taskDoc("IN_PROGRESS"), userId: "someone-else" });
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID }, body: { status: "DONE" } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
    expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("validates the body", async () => {
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID }, body: { status: "WHATEVER" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });
});
