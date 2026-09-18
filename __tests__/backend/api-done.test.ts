/**
 * @jest-environment node
 */
import handler from "@/pages/api/tasks/[id]/done";
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

function taskDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => TASK_ID },
    userId: OWNER,
    title: "Ship the demo",
    status: "PENDING",
    doneAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

  async function callDone(current: Record<string, unknown>) {
    mockCollection.findOne.mockResolvedValue(current);
    const res = fakeRes();
    await handler(fakeReq({ query: { id: TASK_ID } }), res);
    return res;
  }

  describe("POST /api/tasks/:id/done", () => {
    beforeEach(resetCollection);

    it("marks a PENDING task as DONE", async () => {
      const done = taskDoc({ status: "DONE", doneAt: new Date("2026-02-02") });
      mockCollection.findOneAndUpdate.mockResolvedValue(done);

      const res = await callDone(taskDoc());

      expect(res.statusCode).toBe(200);
      expect(res.body.alreadyDone).toBe(false);
      expect(res.body.task?.status).toBe("DONE");
    });

    it("is idempotent: calling again on a DONE task returns it unchanged", async () => {
      const done = taskDoc({ status: "DONE", doneAt: new Date("2026-02-02") });
      const res = await callDone(done);

      expect(res.statusCode).toBe(200);
      expect(res.body.alreadyDone).toBe(true);
      // No write attempted.
      expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("loses the atomic claim concurrently but stays idempotent (raced caller sees DONE)", async () => {
      // Initial read: PENDING. Update filter fails because another caller won.
      // Re-read after the race: the other caller has already marked it DONE.
      mockCollection.findOne.mockResolvedValueOnce(taskDoc());
      mockCollection.findOneAndUpdate.mockResolvedValue(null);
      mockCollection.findOne.mockResolvedValueOnce(taskDoc({ status: "DONE", doneAt: new Date() }));

      const res = fakeRes();
      await handler(fakeReq({ query: { id: TASK_ID } }), res);

      expect(res.statusCode).toBe(200);
      expect(res.body.alreadyDone).toBe(true);
      expect(res.body.task?.status).toBe("DONE");
    });

    it("rejects marking an ARCHIVED task as done", async () => {
      const res = await callDone(taskDoc({ status: "ARCHIVED" }));

      expect(res.statusCode).toBe(409);
      expect(res.body.error?.code).toBe("INVALID_TRANSITION");
    });

    it("forbids marking someone else's task as done", async () => {
      const res = await callDone(taskDoc({ userId: "someone-else" }));

      expect(res.statusCode).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
      expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("returns 404 for an invalid id", async () => {
      const res = fakeRes();
      await handler(fakeReq({ query: { id: "not-an-object-id" } }), res);
      expect(res.statusCode).toBe(404);
    });

    it("rejects non-POST methods", async () => {
      mockCollection.findOne.mockResolvedValue(taskDoc());
      const res = fakeRes();
      await handler(fakeReq({ method: "GET", query: { id: TASK_ID } }), res);
      expect(res.statusCode).toBe(405);
    });
  });
