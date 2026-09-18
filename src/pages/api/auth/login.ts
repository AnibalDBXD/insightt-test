import type { NextApiRequest, NextApiResponse } from "next";
import { decodeJwt } from "jose";
import { cognitoCall, cognitoConfigured, authParameters } from "@/lib/cognito";
import { fail, ok } from "@/lib/http";
import { setActor, withLogging, logError } from "@/lib/logger";
import { loginSchema } from "@/lib/validation/auth.schema";
import { parseBody } from "@/lib/validation/parse";
import { getUsersCollection } from "@/lib/db";

interface AuthResult {
  AuthenticationResult?: {
    AccessToken: string;
    IdToken: string;
    ExpiresIn: number;
  };
}

export default withLogging(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "METHOD_NOT_ALLOWED");
  }
  if (!cognitoConfigured()) return fail(res, 500, "SERVER_NOT_CONFIGURED");

  const { data, errors } = parseBody(loginSchema, req.body);
  if (errors) return fail(res, 400, "VALIDATION_ERROR", errors);

  try {
    const result = (await cognitoCall("InitiateAuth", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: authParameters(data.email, data.password),
    })) as AuthResult;

    const auth = result.AuthenticationResult;
    if (!auth) return fail(res, 401, "INVALID_CREDENTIALS");

    const claims = decodeJwt(auth.IdToken) as { sub?: string; email?: string };
    setActor(req, { sub: claims.sub || "", email: claims.email || data.email });
    try {
      const users = await getUsersCollection();
      if (claims.sub) {
        await users.updateOne(
          { cognitoSub: claims.sub },
          {
            $set: { email: claims.email || data.email },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }
    } catch {
      // Mongo is a convenience mirror; login must not fail without it.
    }

    return ok(res, {
      accessToken: auth.AccessToken,
      idToken: auth.IdToken,
      expiresIn: auth.ExpiresIn,
      user: { sub: claims.sub, email: claims.email || data.email },
    });
  } catch (e) {
    logError(req, e);
    const err = e as { code?: string };
    if (err.code === "NotAuthorizedException") return fail(res, 401, "INVALID_CREDENTIALS");
    if (err.code === "UserNotConfirmedException") return fail(res, 403, "USER_NOT_CONFIRMED");
    return fail(res, 500, "INTERNAL_ERROR");
  }
});
