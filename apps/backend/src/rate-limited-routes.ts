import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

type RateLimitPluginOptions = NonNullable<Parameters<typeof rateLimit>[1]>;

export async function registerRateLimitedRoutes(
  app: FastifyInstance,
  options: RateLimitPluginOptions,
  registerRoutes: (app: FastifyInstance) => Promise<void>,
) {
  await app.register(async (limitedApp) => {
    await limitedApp.register(rateLimit, options);
    await registerRoutes(limitedApp);
  });
}
