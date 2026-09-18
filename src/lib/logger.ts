import type { NextApiRequest, NextApiResponse } from "next";

interface LoggedUser {
  sub: string;
  email?: string;
}

const ACTOR = Symbol("actor");

// Middleware strategy: wraps any handler, logs input (method, path, query,
// body, headers) and output (status, duration) with timestamp and actor.
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
