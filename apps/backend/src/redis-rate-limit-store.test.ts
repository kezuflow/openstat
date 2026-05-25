import {
  createRedisRateLimitStore,
  getIngestionRateLimitKey,
} from "./redis-rate-limit-store.js";
import { describe, expect, it, vi } from "vitest";

describe("Redis rate limit store", () => {
  it("uses API key prefixes when available", () => {
    expect(
      getIngestionRateLimitKey("Bearer ostat_public_secret", "127.0.0.1"),
    ).toBe("ingest:api-key:ostat_public");
  });

  it("falls back to IP counters when no OpenStat API key is present", () => {
    expect(getIngestionRateLimitKey(undefined, "127.0.0.1")).toBe(
      "ingest:ip:127.0.0.1",
    );
    expect(getIngestionRateLimitKey("Bearer invalid", "127.0.0.2")).toBe(
      "ingest:ip:127.0.0.2",
    );
  });

  it("increments Redis counters with TTL-bearing OpenStat rate keys", async () => {
    const client = {
      incrementRateLimitCounter: vi.fn().mockResolvedValue({
        current: 2,
        ttl: 50_000,
      }),
    };
    const Store = createRedisRateLimitStore(client);
    const store = new Store();

    const result = await new Promise<{ current: number; ttl: number }>(
      (resolve, reject) => {
        store.incr(
          "ingest:api-key:ostat_public",
          (error, value) => {
            if (error || !value) {
              reject(error ?? new Error("missing rate limit result"));
              return;
            }

            resolve(value);
          },
          60_000,
        );
      },
    );

    expect(client.incrementRateLimitCounter).toHaveBeenCalledWith(
      "openstat:rate:ingest:api-key:ostat_public:60000",
      60_000,
    );
    expect(result).toEqual({
      current: 2,
      ttl: 50_000,
    });
  });

  it("scopes child stores by route before the rate key", async () => {
    const client = {
      incrementRateLimitCounter: vi.fn().mockResolvedValue({
        current: 1,
        ttl: 60_000,
      }),
    };
    const Store = createRedisRateLimitStore(client);
    const store = new Store().child({
      routeInfo: {
        method: "POST",
        url: "/v1/ingest/events",
      },
    });

    await new Promise<void>((resolve, reject) => {
      store.incr(
        "ingest:ip:127.0.0.1",
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
        60_000,
      );
    });

    expect(client.incrementRateLimitCounter).toHaveBeenCalledWith(
      "openstat:rate:POST/v1/ingest/events:ingest:ip:127.0.0.1:60000",
      60_000,
    );
  });
});
