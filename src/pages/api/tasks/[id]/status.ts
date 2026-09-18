import { ObjectId } from "mongodb";
import { getTasksCollection } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { withLogging } from "@/lib/logger";
import { fail, ok } from "@/lib/http";
import { toDTO } from "@/lib/taskMapper";
import { taskStatusSchema } from "@/lib/validation/task.schema";
import { parseBody } from "@/lib/validation/parse";
import { canTransition } from "@/lib/taskState";

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
    const { data, errors } = parseBody(taskStatusSchema, req.body);
    if (errors) return fail(res, 400, "VALIDATION_ERROR", errors);

    const tasks = await getTasksCollection();
    const task = await tasks.findOne({ _id: new ObjectId(id) });
    if (!task) return fail(res, 404, "NOT_FOUND");
    if (task.userId !== ctx.user.sub) return fail(res, 403, "FORBIDDEN");

    const from = task.status as (typeof data)["status"];
    if (from !== data.status && !canTransition(from, data.status)) {
      return fail(res, 409, "INVALID_TRANSITION");
    }

    const updated = await tasks.findOneAndUpdate(
      { _id: task._id, userId: ctx.user.sub, status: from },
      { $set: { status: data.status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) return fail(res, 409, "INVALID_TRANSITION");
    return ok(res, toDTO(updated));
  })
);
