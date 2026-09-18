import type { NextApiRequest, NextApiResponse } from "next";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { fail } from "./http";
import { cognitoConfigured } from "./cognito";
import { setActor } from "./logger";

export function e2eTestMode() {
  return process.env.E2E_TEST_MODE === "1";
}

export const E2E_TEST_EMAIL = "e2e@test.local";
export const E2E_TEST_PASSWORD = "Test1234!";

function testKey(): Uint8Array {
  return new TextEncoder().encode(process.env.E2E_TEST_SECRET || "e2e-test-secret");
}

export async function signTestToken(sub: string, email: string) {
  return new SignJWT({ email, token_use: "access", client_id: process.env.COGNITO_CLIENT_ID })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setIssuer(
      `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
    )
    .setExpirationTime("1h")
    .sign(testKey());
}

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

function isTestToken(token: string) {
  if (!e2eTestMode()) return false;
  const [h] = token.split(".");
  if (!h) return false;
  try {
    const header = JSON.parse(Buffer.from(h, "base64url").toString()) as { alg?: string };
    return header.alg === "HS256";
  } catch {
    return false;
  }
}

export async function verifyAccessToken(token: string) {
  // Test-mode tokens are HS256-signed locally; real tokens are RS256 via JWKS.
  const { payload } = await jwtVerify(
    token,
    isTestToken(token) ? testKey() : jwks(),
    {
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
    }
  );
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
