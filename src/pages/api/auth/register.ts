import type { NextApiRequest, NextApiResponse } from "next";
import { cognitoCall, cognitoConfigured, signUpRequest } from "@/lib/cognito";
import { fail, ok } from "@/lib/http";
import { setActor, withLogging } from "@/lib/logger";
import { registerSchema } from "@/lib/validation/auth.schema";
import { parseBody } from "@/lib/validation/parse";
import { getUsersCollection } from "@/lib/db";

export default withLogging(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "METHOD_NOT_ALLOWED");
  }
  if (!cognitoConfigured()) return fail(res, 500, "SERVER_NOT_CONFIGURED");

  const { data, errors } = parseBody(registerSchema, req.body);
  if (errors) return fail(res, 400, "VALIDATION_ERROR", errors);
  setActor(req, { sub: "", email: data.email });

  try {
    const result = await cognitoCall("SignUp", signUpRequest(data.email, data.password));
    try {
      const users = await getUsersCollection();
      await users.updateOne(
        { email: data.email },
        { $setOnInsert: { email: data.email, createdAt: new Date() } },
        { upsert: true }
      );
    } catch {
      // Mongo is a convenience mirror; registration must not fail without it.
    }
    return ok(res, { confirmed: result.UserConfirmed === "Yes" });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "UsernameExistsException") return fail(res, 409, "EMAIL_EXISTS");
    if (err.code === "InvalidPasswordException") return fail(res, 400, "INVALID_PASSWORD");
    return fail(res, 500, "INTERNAL_ERROR");
  }
});
