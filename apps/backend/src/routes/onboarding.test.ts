import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerOnboardingRoutes } from "./onboarding.js";

const state = vi.hoisted(() => ({
  authGetSession: vi.fn(),
  db: {
    insert: vi.fn(),
  },
}));

vi.mock("../context.js", () => ({
  auth: {
    api: {
      getSession: state.authGetSession,
    },
  },
  database: {
    db: state.db,
  },
}));

const session = {
  user: {
    id: "user_test",
    name: "Test User",
    email: "test@example.com",
  },
};

describe("onboarding routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authGetSession.mockResolvedValue(session);
  });

  it("marks dashboard onboarding dismissed for the current user", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate,
    });

    state.db.insert.mockReturnValue({ values });

    const app = await createApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/v1/onboarding/dashboard",
      payload: {
        status: "dismissed",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      onboarding: {
        key: "dashboard_v1",
        isNewUser: false,
        shouldShow: false,
      },
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_test",
        key: "dashboard_v1",
        dismissedAt: expect.any(Date),
      }),
    );
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          dismissedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      }),
    );

    await app.close();
  });

  it("requires an authenticated session", async () => {
    state.authGetSession.mockResolvedValue(null);

    const app = await createApp();
    const response = await app.inject({
      method: "PATCH",
      url: "/v1/onboarding/dashboard",
      payload: {
        status: "completed",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
        requestId: expect.any(String),
      },
    });

    await app.close();
  });
});

async function createApp() {
  const app = Fastify({ logger: false });

  await registerOnboardingRoutes(app);

  return app;
}
