import type { NextApiRequest, NextApiResponse } from "next";

export function fakeReq(opts: {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: unknown;
  headers?: Record<string, string>;
}): NextApiRequest {
  return {
    method: opts.method ?? "POST",
    headers: opts.headers ?? {},
    query: opts.query ?? {},
    body: opts.body ?? {},
    cookies: {},
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;
}

export function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    body: undefined as unknown as {
      error?: { code: string };
      alreadyDone?: boolean;
      deleted?: boolean;
      status?: string;
      id?: string;
      task?: Record<string, unknown>;
    },
    setHeader(key: string, value: unknown) {
      res.headers[key] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload as never;
      return res;
    },
  };
  return res as unknown as NextApiResponse & typeof res;
}

export const collection = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  insertOne: jest.fn(),
  deleteOne: jest.fn(),
  updateOne: jest.fn(),
  find: jest.fn(),
};

export function resetCollection() {
  for (const mock of Object.values(collection)) {
    (mock as jest.Mock).mockReset();
  }
}

export const TASK_ID = "665f1a2b3c4d5e6f708192a1";
export const OWNER = "owner-sub-1";
