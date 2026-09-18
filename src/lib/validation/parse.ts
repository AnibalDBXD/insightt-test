import { z, flattenError } from "zod";

export function parseBody<S extends z.ZodType>(schema: S, body: unknown) {
  const result = schema.safeParse(body);
  if (result.success) {
    return { data: result.data as z.infer<S>, errors: null as null };
  }
  return { data: null, errors: flattenError(result.error).fieldErrors };
}
