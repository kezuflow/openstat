import { createOpenStatAuth } from "@openstat/auth";
import { createDatabase } from "@openstat/db";
import {
  createIngestionRedisClient,
  type IngestionSignalClient,
  type IngestionSignalPublisher,
} from "@openstat/ingestion";

import { env } from "./config/env.js";

export const database = createDatabase(env.databaseUrl);
export const ingestionSignalClient: IngestionSignalClient | undefined =
  createIngestionRedisClient(env.redisUrl);
export const ingestionSignalPublisher: IngestionSignalPublisher | undefined =
  ingestionSignalClient;

export const auth = createOpenStatAuth({
  db: database.db,
  baseUrl: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  trustedOrigins: [env.appWebUrl, env.apiPublicUrl],
  googleClientId: env.googleClientId,
  googleClientSecret: env.googleClientSecret,
});
