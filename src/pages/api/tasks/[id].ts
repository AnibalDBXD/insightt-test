import { ObjectId } from "mongodb";
import { getTasksCollection } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { withLogging } from "@/lib/logger";
import { fail, ok } from "@/lib/http";
import { toDTO } from "@/lib/taskMapper";
import { taskEditSchema } from "@/lib/validation/task.schema";
import { parseBody } from "@/lib/validation/parse";

export default withLogging(
  withAuth(async (req, res, ctx) => {
    const { id } = req.query;
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      return fail(res, 404, "NOT_FOUND");
    }
    const tasks = await getTasksCollection();
    const task = await tasks.findOne({ _id: new ObjectId(id) });

    if (req.method === "PATCH") {
      if (!task) return fail(res, 404, "NOT_FOUND");
      if (task.userId !== ctx.user.sub) return fail(res, 403, "FORBIDDEN");

      const { data, errors } = parseBody(taskEditSchema, req.body);
      if (errors) return fail(res, 400, "VALIDATION_ERROR", errors);

      const changes = Object.keys(data);
      if (changes.length === 0) {
        return fail(res, 400, "VALIDATION_ERROR", { _: ["EMPTY_PATCH"] });
      }
      // A task marked as DONE cannot be edited, except a title typo fix.
      if (task.status === "DONE" && changes.some((k) => k !== "title")) {
        return fail(res, 409, "TASK_NOT_EDITABLE");
      }

      const updated = await tasks.findOneAndUpdate(
        { _id: task._id },
        { $set: { ...data, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!updated) return fail(res, 404, "NOT_FOUND");
      return ok(res, toDTO(updated));
    }

    if (req.method === "DELETE") {
      if (!task) return fail(res, 404, "NOT_FOUND");
      if (task.userId !== ctx.user.sub) return fail(res, 403, "FORBIDDEN");
      await tasks.deleteOne({ _id: task._id });
      return ok(res, { deleted: true });
    }

    if (req.method === "GET") {
      if (!task) return fail(res, 404, "NOT_FOUND");
      if (task.userId !== ctx.user.sub) return fail(res, 403, "FORBIDDEN");
      return ok(res, toDTO(task));
    }

    res.setHeader("Allow", "GET, PATCH, DELETE");
    return fail(res, 405, "METHOD_NOT_ALLOWED");
  })
);
