import { createAuthClient } from "better-auth/react";

export const authBaseURL = `${process.env.NEXT_PUBLIC_OPENSTAT_API_URL ?? "http://localhost:4000"}/api/auth`;

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient(
  {
    baseURL: authBaseURL,
  },
);
