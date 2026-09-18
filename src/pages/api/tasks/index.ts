import { getTasksCollection } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { withLogging } from "@/lib/logger";
import { fail, ok } from "@/lib/http";
import { toDTO } from "@/lib/taskMapper";
import { taskCreateSchema } from "@/lib/validation/task.schema";
import { parseBody } from "@/lib/validation/parse";

export default withLogging(
  withAuth(async (req, res, ctx) => {
    const tasks = await getTasksCollection();

    if (req.method === "GET") {
      const docs = await tasks
        .find({ userId: ctx.user.sub })
        .sort({ updatedAt: -1 })
        .toArray();
      return ok(res, docs.map(toDTO));
    }

    if (req.method === "POST") {
      const { data, errors } = parseBody(taskCreateSchema, req.body);
      if (errors) return fail(res, 400, "VALIDATION_ERROR", errors);
      const now = new Date();
      const doc = {
        title: data.title,
        description: data.description,
        userId: ctx.user.sub,
        status: "PENDING",
        doneAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const result = await tasks.insertOne(doc);
      return ok(res, toDTO({ _id: result.insertedId, ...doc }), 201);
    }

    res.setHeader("Allow", "GET, POST");
    return fail(res, 405, "METHOD_NOT_ALLOWED");
  })
);
