import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { registerRateLimitedRoutes } from "./rate-limited-routes.js";

describe("rate-limited route scopes", () => {
  it("applies rate limiting only to routes registered inside the limited scope", async () => {
    const app = Fastify({ logger: false });

    app.get("/health", async () => ({ status: "ok" }));

    await registerRateLimitedRoutes(
      app,
      {
        max: 1,
        timeWindow: "1 minute",
      },
      async (limitedApp) => {
        limitedApp.post("/v1/ingest/events", async () => ({ accepted: true }));
      },
    );

    const firstHealth = await app.inject({ method: "GET", url: "/health" });
    const secondHealth = await app.inject({ method: "GET", url: "/health" });

    expect(firstHealth.statusCode).toBe(200);
    expect(secondHealth.statusCode).toBe(200);
    expect(secondHealth.headers["x-ratelimit-limit"]).toBeUndefined();

    const firstIngest = await app.inject({
      method: "POST",
      url: "/v1/ingest/events",
    });
    const secondIngest = await app.inject({
      method: "POST",
      url: "/v1/ingest/events",
    });

    expect(firstIngest.statusCode).toBe(200);
    expect(firstIngest.headers["x-ratelimit-limit"]).toBe("1");
    expect(secondIngest.statusCode).toBe(429);

    await app.close();
  });
});
