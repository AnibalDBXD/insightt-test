import type { NextApiRequest, NextApiResponse } from "next";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { fail } from "./http";
import { cognitoConfigured } from "./cognito";
import { setActor } from "./logger";

export interface AuthedUser {
  sub: string;
  email?: string;
}

const remoteJwksCache = globalThis as unknown as {
  __cognitoJwks?: ReturnType<typeof createRemoteJWKSet>;
};

function jwks() {
  if (!remoteJwksCache.__cognitoJwks) {
    const url = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
    remoteJwksCache.__cognitoJwks = createRemoteJWKSet(new URL(url));
  }
  return remoteJwksCache.__cognitoJwks;
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, jwks(), {
    issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
  });
  if (
    payload.token_use !== "access" ||
    payload.client_id !== process.env.COGNITO_CLIENT_ID
  ) {
    throw new Error("UNAUTHORIZED");
  }
  return payload;
}

export type AuthedHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: { user: AuthedUser }
) => void | Promise<void>;

// Middleware strategy: every protected route wraps its handler with this.
export function withAuth(handler: AuthedHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!cognitoConfigured()) return fail(res, 500, "SERVER_NOT_CONFIGURED");
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    try {
      const payload = await verifyAccessToken(token);
      const user = {
        sub: payload.sub as string,
        email: payload.email as string | undefined,
      };
      setActor(req, user);
      return handler(req, res, { user });
    } catch {
      return fail(res, 401, "UNAUTHORIZED");
    }
  };
}
