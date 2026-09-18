import { getTasksCollection, getUsersCollection } from "@/lib/db";
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
      // Store the owner's email on the task so cards can show it without joins.
      let ownerEmail: string | undefined = ctx.user.email;
      try {
        const owner = await getUsersCollection().then((users) =>
          users.findOne({ cognitoSub: ctx.user.sub })
        );
        if (owner?.email) ownerEmail = owner.email as string;
      } catch {
        // Mirror lookup is best-effort; the card falls back to the session email.
      }
      const now = new Date();
      const doc = {
        title: data.title,
        description: data.description,
        userId: ctx.user.sub,
        ownerEmail,
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
