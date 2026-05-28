import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { schema, type Database } from "@openstat/db";

const keyPrefix = "ostat";
const publicPartBytes = 9;
const secretPartBytes = 24;

export class ApiKeyAuthError extends Error {
  constructor(
    public readonly code: ApiKeyAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiKeyAuthError";
  }
}

export type ApiKeyAuthErrorCode =
  | "MISSING_API_KEY"
  | "INVALID_API_KEY"
  | "REVOKED_API_KEY"
  | "EXPIRED_API_KEY"
  | "MISSING_DEFAULT_PROJECT";

export interface ApiKeyAuthContext {
  apiKeyId: string;
  organizationId: string;
  projectId: string;
}

export type ApiKeyLookupRow = {
  id: string;
  organizationId: string;
  projectId: string;
  secretHash: string;
  revokedAt: Date | string | null;
  expiresAt: Date | string | null;
};

export interface ApiKeyLookupCache {
  get(prefix: string): Promise<ApiKeyLookupRow | undefined>;
  set(prefix: string, row: ApiKeyLookupRow): Promise<void>;
}

export function generateApiKey() {
  const publicPart = generateKeyPart(publicPartBytes);
  const secret = generateKeyPart(secretPartBytes);
  const prefix = `${keyPrefix}_${publicPart}`;
  const key = `${prefix}_${secret}`;

  return {
    key,
    prefix,
    secretHash: hashApiKeySecret(secret),
  };
}

function generateKeyPart(byteLength: number) {
  return randomBytes(byteLength).toString("base64url").replaceAll("_", "-");
}

export async function authenticateApiKey(options: {
  db: Database["db"];
  authorizationHeader: string | undefined;
  cache?: ApiKeyLookupCache;
}): Promise<ApiKeyAuthContext> {
  const key = getBearerToken(options.authorizationHeader);

  if (!key) {
    throw new ApiKeyAuthError("MISSING_API_KEY", "Missing API key.");
  }

  const parsed = parseApiKey(key);

  if (!parsed) {
    throw new ApiKeyAuthError("INVALID_API_KEY", "Invalid API key.");
  }

  const apiKey = await getApiKeyLookupRow({
    cache: options.cache,
    db: options.db,
    prefix: parsed.prefix,
  });

  if (
    !apiKey ||
    !safeEqual(apiKey.secretHash, hashApiKeySecret(parsed.secret))
  ) {
    throw new ApiKeyAuthError("INVALID_API_KEY", "Invalid API key.");
  }

  if (apiKey.revokedAt) {
    throw new ApiKeyAuthError("REVOKED_API_KEY", "API key has been revoked.");
  }

  if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
    throw new ApiKeyAuthError("EXPIRED_API_KEY", "API key has expired.");
  }

  await options.db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.apiKeys.id, apiKey.id));

  return {
    apiKeyId: apiKey.id,
    organizationId: apiKey.organizationId,
    projectId: apiKey.projectId,
  };
}

async function getApiKeyLookupRow(options: {
  cache?: ApiKeyLookupCache;
  db: Database["db"];
  prefix: string;
}) {
  try {
    const cached = await options.cache?.get(options.prefix);

    if (cached) {
      return normalizeApiKeyLookupRow(cached);
    }
  } catch {
    // Cache failures must not block API key authentication.
  }

  const [apiKey] = await options.db
    .select({
      id: schema.apiKeys.id,
      organizationId: schema.apiKeys.organizationId,
      projectId: schema.apiKeys.projectId,
      secretHash: schema.apiKeys.secretHash,
      revokedAt: schema.apiKeys.revokedAt,
      expiresAt: schema.apiKeys.expiresAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.prefix, options.prefix))
    .limit(1);

  if (!apiKey) {
    return undefined;
  }

  try {
    await options.cache?.set(options.prefix, apiKey);
  } catch {
    // Cache writes are best-effort; Postgres remains canonical.
  }

  return apiKey;
}

function normalizeApiKeyLookupRow(row: ApiKeyLookupRow): ApiKeyLookupRow {
  return {
    ...row,
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
  };
}

export function createOpenStatAuth(options: {
  db: Database["db"];
  baseUrl: string;
  secret: string;
  trustedOrigins: string[];
  requireEmailVerification: boolean;
  emailDelivery: AuthEmailDelivery;
  cookieDomain?: string;
  googleClientId?: string;
  googleClientSecret?: string;
}) {
  return betterAuth({
    baseURL: options.baseUrl,
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    advanced: options.cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: options.cookieDomain,
          },
        }
      : undefined,
    database: drizzleAdapter(options.db, {
      provider: "pg",
      schema,
    }),
    emailVerification: {
      sendOnSignUp: options.requireEmailVerification,
      sendOnSignIn: options.requireEmailVerification,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({
          delivery: options.emailDelivery,
          kind: "email-verification",
          to: user.email,
          actionUrl: url,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: options.requireEmailVerification,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({
          delivery: options.emailDelivery,
          kind: "password-reset",
          to: user.email,
          actionUrl: url,
        });
      },
      revokeSessionsOnPasswordReset: true,
    },
    socialProviders:
      options.googleClientId && options.googleClientSecret
        ? {
            google: {
              clientId: options.googleClientId,
              clientSecret: options.googleClientSecret,
            },
          }
        : undefined,
  });
}

export type AuthEmailDelivery =
  | {
      provider: "log";
      from?: string;
    }
  | {
      provider: "resend";
      apiKey: string;
      from: string;
    };

type AuthEmailInput = {
  delivery: AuthEmailDelivery;
  kind: "email-verification" | "password-reset";
  to: string;
  actionUrl: string;
};

async function sendAuthEmail(input: AuthEmailInput) {
  const message = createAuthEmailMessage(input);

  if (input.delivery.provider === "log") {
    console.info(
      `[auth-email] ${message.subject} to ${input.to}: ${input.actionUrl}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.delivery.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: input.delivery.from,
      to: [input.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to send auth email through Resend (${response.status}). ${body}`,
    );
  }
}

function createAuthEmailMessage(input: AuthEmailInput) {
  const subject =
    input.kind === "email-verification"
      ? "Verify your OpenStat email"
      : "Reset your OpenStat password";
  const heading =
    input.kind === "email-verification"
      ? "Verify your email"
      : "Reset your password";
  const body =
    input.kind === "email-verification"
      ? "Use this link to verify your OpenStat account."
      : "Use this link to choose a new OpenStat password.";

  return {
    subject,
    text: `${body}\n\n${input.actionUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f7f7f4;color:#111111;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #dddddd;border-radius:8px;padding:28px;">
            <tr><td style="font-size:20px;font-weight:700;">${heading}</td></tr>
            <tr><td style="padding-top:12px;font-size:14px;line-height:22px;color:#444444;">${body}</td></tr>
            <tr><td style="padding-top:24px;"><a href="${input.actionUrl}" style="display:inline-block;background:#050505;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 16px;font-size:14px;font-weight:700;">Continue to OpenStat</a></td></tr>
            <tr><td style="padding-top:24px;font-size:12px;line-height:18px;color:#707070;">If you did not request this, you can ignore this email.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function getBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    return undefined;
  }

  const [scheme, token] = authorizationHeader.split(/\s+/u);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}

function parseApiKey(key: string) {
  const parts = key.split("_");

  if (parts.length !== 3 || parts[0] !== keyPrefix || !parts[1] || !parts[2]) {
    return undefined;
  }

  return {
    prefix: `${parts[0]}_${parts[1]}`,
    secret: parts[2],
  };
}

function hashApiKeySecret(secret: string) {
  return createHash("sha256").update(secret).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
