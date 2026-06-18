import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerWorkspaceRoutes } from "./workspace.js";

const state = vi.hoisted(() => ({
  authGetSession: vi.fn(),
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
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

describe("workspace routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authGetSession.mockResolvedValue(session);
  });

  it("initializes an existing member into the default project", async () => {
    const membershipLimit = vi
      .fn()
      .mockResolvedValue([{ organizationId: "org_test" }]);
    const membershipOrderBy = vi.fn().mockReturnValue({
      limit: membershipLimit,
    });
    const membershipWhere = vi.fn().mockReturnValue({
      orderBy: membershipOrderBy,
    });
    const membershipFrom = vi.fn().mockReturnValue({
      where: membershipWhere,
    });

    const defaultProjectLimit = vi
      .fn()
      .mockResolvedValue([{ id: "project_default" }]);
    const defaultProjectWhere = vi.fn().mockReturnValue({
      limit: defaultProjectLimit,
    });
    const defaultProjectFrom = vi.fn().mockReturnValue({
      where: defaultProjectWhere,
    });
    const onboardingInsert = mockOnboardingInsert();
    const onboardingLimit = vi
      .fn()
      .mockResolvedValue([{ key: "dashboard_v1" }]);
    const onboardingWhere = vi.fn().mockReturnValue({
      limit: onboardingLimit,
    });
    const onboardingFrom = vi.fn().mockReturnValue({
      where: onboardingWhere,
    });

    state.db.select
      .mockReturnValueOnce({ from: membershipFrom })
      .mockReturnValueOnce({ from: defaultProjectFrom })
      .mockReturnValueOnce({ from: onboardingFrom });
    state.db.insert.mockReturnValue(onboardingInsert);

    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/init",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workspaceId: "org_test",
      projectId: "project_default",
      onboarding: {
        key: "dashboard_v1",
        isNewUser: false,
        shouldShow: true,
      },
    });
    expect(membershipOrderBy).toHaveBeenCalledOnce();
    expect(defaultProjectWhere).toHaveBeenCalledOnce();
    expect(onboardingWhere).toHaveBeenCalledOnce();
    expect(onboardingInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_test",
        key: "dashboard_v1",
        firstShownAt: expect.any(Date),
      }),
    );
    expect(
      sqlExpressionIncludesColumn(
        defaultProjectWhere.mock.calls[0]?.[0],
        "is_default",
      ),
    ).toBe(true);

    await app.close();
  });

  it("promotes an existing project when an organization has no default", async () => {
    const membershipLimit = vi
      .fn()
      .mockResolvedValue([{ organizationId: "org_test" }]);
    const membershipOrderBy = vi.fn().mockReturnValue({
      limit: membershipLimit,
    });
    const membershipWhere = vi.fn().mockReturnValue({
      orderBy: membershipOrderBy,
    });
    const membershipFrom = vi.fn().mockReturnValue({
      where: membershipWhere,
    });

    const defaultProjectLimit = vi.fn().mockResolvedValue([]);
    const defaultProjectWhere = vi.fn().mockReturnValue({
      limit: defaultProjectLimit,
    });
    const defaultProjectFrom = vi.fn().mockReturnValue({
      where: defaultProjectWhere,
    });

    const existingProjectLimit = vi
      .fn()
      .mockResolvedValue([{ id: "project_existing" }]);
    const existingProjectOrderBy = vi.fn().mockReturnValue({
      limit: existingProjectLimit,
    });
    const existingProjectWhere = vi.fn().mockReturnValue({
      orderBy: existingProjectOrderBy,
    });
    const existingProjectFrom = vi.fn().mockReturnValue({
      where: existingProjectWhere,
    });

    const updateReturning = vi
      .fn()
      .mockResolvedValue([{ id: "project_existing" }]);
    const updateWhere = vi.fn().mockReturnValue({
      returning: updateReturning,
    });
    const updateSet = vi.fn().mockReturnValue({
      where: updateWhere,
    });
    const onboardingInsert = mockOnboardingInsert();
    const onboardingLimit = vi
      .fn()
      .mockResolvedValue([{ key: "dashboard_v1" }]);
    const onboardingWhere = vi.fn().mockReturnValue({
      limit: onboardingLimit,
    });
    const onboardingFrom = vi.fn().mockReturnValue({
      where: onboardingWhere,
    });

    state.db.select
      .mockReturnValueOnce({ from: membershipFrom })
      .mockReturnValueOnce({ from: defaultProjectFrom })
      .mockReturnValueOnce({ from: existingProjectFrom })
      .mockReturnValueOnce({ from: onboardingFrom });
    state.db.insert.mockReturnValue(onboardingInsert);
    state.db.update.mockReturnValue({ set: updateSet });

    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/init",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workspaceId: "org_test",
      projectId: "project_existing",
      onboarding: {
        key: "dashboard_v1",
        isNewUser: false,
        shouldShow: true,
      },
    });
    expect(existingProjectOrderBy).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isDefault: true,
        updatedAt: expect.any(Date),
      }),
    );

    await app.close();
  });

  it("requires an authenticated session", async () => {
    state.authGetSession.mockResolvedValue(null);

    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/init",
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

  await registerWorkspaceRoutes(app);

  return app;
}

function mockOnboardingInsert() {
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({
    onConflictDoNothing,
  });

  return {
    values,
  };
}

function sqlExpressionIncludesColumn(
  value: unknown,
  columnName: string,
  seen = new WeakSet<object>(),
): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  if ("name" in value && value.name === columnName) {
    return true;
  }

  if ("queryChunks" in value && Array.isArray(value.queryChunks)) {
    return value.queryChunks.some((chunk) =>
      sqlExpressionIncludesColumn(chunk, columnName, seen),
    );
  }

  return Object.values(value).some((child) =>
    sqlExpressionIncludesColumn(child, columnName, seen),
  );
}
