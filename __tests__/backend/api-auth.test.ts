/**
 * @jest-environment node
 */
import { withAuth } from "@/lib/auth";
import { fakeReq, fakeRes } from "./helpers";

process.env.COGNITO_REGION = "us-east-1";
process.env.COGNITO_USER_POOL_ID = "us-east-1_testpool";
process.env.COGNITO_CLIENT_ID = "testclient";

// jose is ESM-only and would require network for real JWKS validation; the
// middleware's token extraction and 401 mapping are what we unit test here.
jest.mock("jose", () => ({
  jwtVerify: jest.fn(async () => {
    throw new Error("invalid token");
  }),
  createRemoteJWKSet: jest.fn(() => "jwks"),
  decodeJwt: jest.fn(),
}));

const handler = withAuth(async (_req, res, _ctx) => {
  res.status(200).json({ ok: true });
});

describe("withAuth middleware", () => {
  it("rejects requests without a token", async () => {
    const res = fakeRes();
    await handler(fakeReq({}), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with a malformed token", async () => {
    const res = fakeRes();
    await handler(fakeReq({ headers: { authorization: "Bearer garbage" } }), res);
    expect(res.statusCode).toBe(401);
  });

  it("rejects a token with the wrong scheme", async () => {
    const res = fakeRes();
    await handler(fakeReq({ headers: { authorization: "Basic abc" } }), res);
    expect(res.statusCode).toBe(401);
  });
});
