import { ObjectId } from "mongodb";
import { getTasksCollection } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { withLogging } from "@/lib/logger";
import { fail, ok } from "@/lib/http";
import { toDTO } from "@/lib/taskMapper";
import { canBeMarkedDone, type TaskStatus } from "@/lib/taskState";

export default withLogging(
  withAuth(async (req, res, ctx) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return fail(res, 405, "METHOD_NOT_ALLOWED");
    }
    const { id } = req.query;
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return fail(res, 404, "NOT_FOUND");
    }

    const tasks = await getTasksCollection();
    const task = await tasks.findOne({ _id: new ObjectId(id) });
    if (!task) return fail(res, 404, "NOT_FOUND");
    // Only the task owner can mark it as DONE.
    if (task.userId !== ctx.user.sub) return fail(res, 403, "FORBIDDEN");

    // Idempotent: calling again on an already-DONE task returns it unchanged.
    if (task.status === "DONE") {
      return ok(res, { task: toDTO(task), alreadyDone: true });
    }
    if (!canBeMarkedDone(task.status as TaskStatus)) {
      return fail(res, 409, "INVALID_TRANSITION");
    }

    // Atomic claim: the status filter lets exactly one concurrent caller flip
    // the task to DONE; losers re-read and see it done (idempotent).
    const now = new Date();
    const updated = await tasks.findOneAndUpdate(
      { _id: task._id, userId: ctx.user.sub, status: task.status },
      { $set: { status: "DONE", doneAt: now, updatedAt: now } },
      { returnDocument: "after" }
    );
    if (!updated) {
      const raced = await tasks.findOne({ _id: task._id });
      if (raced && raced.status === "DONE") {
        return ok(res, { task: toDTO(raced), alreadyDone: true });
      }
      return fail(res, 409, "INVALID_TRANSITION");
    }
    return ok(res, { task: toDTO(updated), alreadyDone: false });
  })
);
