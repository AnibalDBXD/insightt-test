import { createHmac } from "node:crypto";

export interface CognitoError extends Error {
  code: string;
}

export function cognitoConfigured() {
  return Boolean(
    process.env.COGNITO_REGION &&
      process.env.COGNITO_USER_POOL_ID &&
      process.env.COGNITO_CLIENT_ID
  );
}

export async function cognitoCall(
  target: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = (await res.json()) as {
    __type?: string;
    message?: string;
  } & Record<string, unknown>;
  if (!res.ok) {
    const err = new Error(data.message || "COGNITO_ERROR") as CognitoError;
    err.code = data.__type?.split("#").pop() || "COGNITO_ERROR";
    throw err;
  }
  return data;
}

export function secretHash(username: string): string | undefined {
  const secret = process.env.COGNITO_CLIENT_SECRET;
  if (!secret) return undefined;
  const clientId = process.env.COGNITO_CLIENT_ID as string;
  return createHmac("sha256", secret)
    .update(`${username}${clientId}`)
    .digest("base64");
}

export function authParameters(
  username: string,
  password: string
): Record<string, string> {
  const params: Record<string, string> = {
    USERNAME: username,
    PASSWORD: password,
  };
  const hash = secretHash(username);
  if (hash) params.SECRET_HASH = hash;
  return params;
}

export function signUpRequest(
  username: string,
  password: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: username }],
  };
  const hash = secretHash(username);
  if (hash) payload.SecretHash = hash;
  return payload;
}
