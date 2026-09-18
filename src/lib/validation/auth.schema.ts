import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("INVALID_EMAIL"),
  password: z.string().min(8, "PASSWORD_TOO_SHORT").max(64, "PASSWORD_TOO_LONG"),
});

export const loginSchema = registerSchema;

export type AuthInput = z.infer<typeof registerSchema>;
