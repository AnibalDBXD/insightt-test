import type { NextApiResponse } from "next";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "EMAIL_EXISTS"
  | "CODE_MISMATCH"
  | "CODE_EXPIRED"
  | "USER_NOT_CONFIRMED"
  | "INVALID_CREDENTIALS"
  | "INVALID_TRANSITION"
  | "TASK_NOT_EDITABLE"
  | "INVALID_PASSWORD"
  | "SERVER_NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export function fail(
  res: NextApiResponse,
  status: number,
  code: ApiErrorCode,
  details?: Record<string, string[]>
) {
  res.status(status).json({ error: { code, details } });
}

export function ok<T>(res: NextApiResponse, body: T, status = 200) {
  res.status(status).json(body);
}
