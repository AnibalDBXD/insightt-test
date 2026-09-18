import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { cognitoCall, cognitoConfigured, secretHash } from "@/lib/cognito";
import { fail, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation/parse";

const confirmSchema = z.object({
  email: z.email("INVALID_EMAIL"),
  code: z.string().min(4).max(10),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "VALIDATION_ERROR");
  }
  if (!cognitoConfigured()) return fail(res, 500, "SERVER_NOT_CONFIGURED");

  const { data, errors } = parseBody(confirmSchema, req.body);
  if (errors) return fail(res, 400, "VALIDATION_ERROR", errors);

  const payload: Record<string, unknown> = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: data.email,
    ConfirmationCode: data.code,
  };
  const hash = secretHash(data.email);
  if (hash) payload.SecretHash = hash;

  try {
    await cognitoCall("ConfirmSignUp", payload);
    return ok(res, { confirmed: true });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "CodeMismatchException") return fail(res, 400, "CODE_MISMATCH");
    if (err.code === "ExpiredCodeException") return fail(res, 400, "CODE_EXPIRED");
    return fail(res, 500, "INTERNAL_ERROR");
  }
}
