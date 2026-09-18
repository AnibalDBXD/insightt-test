/**
 * @jest-environment node
 */
import handler from "@/pages/api/tasks/[id]";
import listHandler from "@/pages/api/tasks/index";
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
    description: "",
    status,
    doneAt: status === "DONE" ? new Date("2026-02-02") : null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function patch(body: unknown) {
  return fakeReq({ method: "PATCH", query: { id: TASK_ID }, body });
}

describe("PATCH /api/tasks/:id", () => {
  beforeEach(resetCollection);

  it("edits a PENDING task", async () => {
    mockCollection.findOne.mockResolvedValue(taskDoc("PENDING"));
    mockCollection.findOneAndUpdate.mockResolvedValue(taskDoc("PENDING"));
    const res = fakeRes();
    await handler(patch({ title: "Renamed" }), res);

    expect(res.statusCode).toBe(200);
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
  });

  it("allows a title typo fix on a DONE task", async () => {
    mockCollection.findOne.mockResolvedValue(taskDoc("DONE"));
    mockCollection.findOneAndUpdate.mockResolvedValue(taskDoc("DONE"));
    const res = fakeRes();
    await handler(patch({ title: "Shipp the demo" }), res);
    expect(res.statusCode).toBe(200);
  });

  it("rejects any non-title change on a DONE task", async () => {
    mockCollection.findOne.mockResolvedValue(taskDoc("DONE"));
    const res = fakeRes();
    await handler(patch({ description: "new description" }), res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error?.code).toBe("TASK_NOT_EDITABLE");
    expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects an empty patch", async () => {
    mockCollection.findOne.mockResolvedValue(taskDoc("PENDING"));
    const res = fakeRes();
    await handler(patch({}), res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects an invalid title", async () => {
    mockCollection.findOne.mockResolvedValue(taskDoc("PENDING"));
    const res = fakeRes();
    await handler(patch({ title: "a".repeat(101) }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("edits a task owned by another user (shared board)", async () => {
    mockCollection.findOne.mockResolvedValue({ ...taskDoc("PENDING"), userId: "someone-else" });
    mockCollection.findOneAndUpdate.mockResolvedValue(taskDoc("PENDING"));
    const res = fakeRes();
    await handler(patch({ title: "Renamed" }), res);

    expect(res.statusCode).toBe(200);
    expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
  });

  it("deletes the owner's task", async () => {
    mockCollection.findOne.mockResolvedValue(taskDoc("PENDING"));
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    const res = fakeRes();
    await handler(fakeReq({ method: "DELETE", query: { id: TASK_ID } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.deleted).toBe(true);
  });

  it("returns 404 for an unknown id", async () => {
    mockCollection.findOne.mockResolvedValue(null);
    const res = fakeRes();
    await handler(patch({ title: "Renamed" }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/tasks", () => {
  it("returns all tasks (shared board)", async () => {
    resetCollection();
    mockCollection.find.mockImplementation(() => ({
      sort: () => ({ toArray: jest.fn(async () => [taskDoc("PENDING")]) }),
    }));
    const res = fakeRes();
    await listHandler(fakeReq({ method: "GET" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockCollection.find).toHaveBeenCalledWith({});
  });

  it("creates a task with PENDING status", async () => {
    resetCollection();
    mockCollection.insertOne.mockResolvedValue({ insertedId: { toString: () => TASK_ID } });
    const res = fakeRes();
    await listHandler(fakeReq({ method: "POST", body: { title: "New task" } }), res);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("PENDING");
    const inserted = mockCollection.insertOne.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.userId).toBe(OWNER);
  });

  it("validates the create body", async () => {
    resetCollection();
    const res = fakeRes();
    await listHandler(fakeReq({ method: "POST", body: { title: "" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });
});
