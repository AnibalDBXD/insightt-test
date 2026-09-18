import type { NextApiRequest, NextApiResponse } from "next";
import { fail } from "./http";
import { resetMongoClient } from "./db";

interface LoggedUser {
  sub: string;
  email?: string;
}

const ACTOR = Symbol("actor");

// Error log line: flattened top-level error fields (name, message, code,
// stack) so they are readable and searchable in log viewers (e.g. Vercel)
// instead of being hidden inside a collapsed nested object.
export function logError(req: NextApiRequest, e: unknown) {
  const mongoProps = (err: unknown): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    const src = err as { code?: unknown; codeName?: unknown; errorLabels?: unknown; cause?: unknown };
    if (src.code !== undefined) out.errorCode = src.code;
    if (src.codeName !== undefined) out.errorCodeName = src.codeName;
    if (src.errorLabels !== undefined) out.errorLabels = src.errorLabels;
    if (src.cause !== undefined) out.errorCause = String(src.cause);
    return out;
  };
  const err =
    e instanceof Error
      ? { errorName: e.name, errorMessage: e.message, errorStack: e.stack, ...mongoProps(e) }
      : { errorMessage: String(e) };
  const actor = (req as { [ACTOR]?: LoggedUser })[ACTOR];
  process.stdout.write(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      actor: actor?.sub || "anonymous",
      actorEmail: actor?.email,
      method: req.method,
      path: req.url,
      query: req.query,
      ...err,
    }) + "\n"
  );
}

// Middleware strategy: wraps any handler, logs input (method, path, query,
// body, headers) and output (status, duration) with timestamp and actor.
// Unexpected handler errors are logged with stack and answered with a
// consistent 500 JSON envelope instead of Next's HTML error page.
export function withLogging(handler: (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const start = Date.now();
    let status = 200;
    const originalStatus = res.status.bind(res);
    res.status = ((code: number) => {
      status = code;
      return originalStatus(code);
    }) as typeof res.status;

    try {
      return await handler(req, res);
    } catch (e) {
      logError(req, e);
      // A dead Mongo topology poisons the cached client; drop it so the next
      // request reconnects instead of failing instantly forever.
      if (e instanceof Error && e.name === "MongoTopologyClosedError") {
        resetMongoClient();
      }
      if (!res.writableEnded) {
        fail(res, 500, "INTERNAL_ERROR");
      }
    } finally {
      const actor = (req as { [ACTOR]?: LoggedUser })[ACTOR];
      const log = {
        timestamp: new Date().toISOString(),
        actor: actor?.sub || "anonymous",
        actorEmail: actor?.email,
        method: req.method,
        path: req.url,
        query: req.query,
        body: redact(req.body),
        headers: { ...req.headers, authorization: "<redacted>" },
        status,
        durationMs: Date.now() - start,
      };
      process.stdout.write(JSON.stringify(log) + "\n");
    }
  };
}

export function setActor(req: NextApiRequest, user: LoggedUser) {
  Object.defineProperty(req, ACTOR, { value: user, enumerable: false });
}

function redact(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const clone = { ...(body as Record<string, unknown>) };
  for (const key of ["password", "code"]) {
    if (clone[key]) clone[key] = "<redacted>";
  }
  return clone;
}
