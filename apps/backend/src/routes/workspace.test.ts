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

  it("keeps pending onboarding visible for a previously enrolled new user", async () => {
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
    expect(state.db.insert).not.toHaveBeenCalled();
    expect(
      sqlExpressionIncludesColumn(
        defaultProjectWhere.mock.calls[0]?.[0],
        "is_default",
      ),
    ).toBe(true);

    await app.close();
  });

  it("does not enroll an existing member when promoting a default project", async () => {
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
    const onboardingLimit = vi.fn().mockResolvedValue([]);
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
        shouldShow: false,
      },
    });
    expect(existingProjectOrderBy).toHaveBeenCalledOnce();
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isDefault: true,
        updatedAt: expect.any(Date),
      }),
    );
    expect(state.db.insert).not.toHaveBeenCalled();

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

  it("returns a workspace created by a concurrent initialization", async () => {
    mockMembershipLookup([]);

    const txExecute = vi.fn().mockResolvedValue(undefined);
    const txMembershipLimit = vi
      .fn()
      .mockResolvedValue([{ organizationId: "org_concurrent" }]);
    const txMembershipOrderBy = vi.fn().mockReturnValue({
      limit: txMembershipLimit,
    });
    const txMembershipWhere = vi.fn().mockReturnValue({
      orderBy: txMembershipOrderBy,
    });
    const txMembershipFrom = vi.fn().mockReturnValue({
      where: txMembershipWhere,
    });
    const tx = {
      execute: txExecute,
      select: vi.fn().mockReturnValue({ from: txMembershipFrom }),
    };

    state.db.transaction.mockImplementation(async (callback) => callback(tx));
    mockDefaultProjectAndOnboarding("project_concurrent");

    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/init",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workspaceId: "org_concurrent",
      projectId: "project_concurrent",
      onboarding: {
        key: "dashboard_v1",
        isNewUser: false,
        shouldShow: false,
      },
    });
    expect(txExecute).toHaveBeenCalledOnce();
    expect(txMembershipLimit).toHaveBeenCalledOnce();

    await app.close();
  });

  it("retries organization insertion when another user owns the slug", async () => {
    mockMembershipLookup([]);

    const organizationValues = vi.fn();
    const organizationReturning = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "org_test",
          name: "Test User",
          slug: "test-user-2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    organizationValues.mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: organizationReturning,
      }),
    });

    const projectReturning = vi
      .fn()
      .mockResolvedValue([{ id: "project_test" }]);
    const projectValues = vi.fn().mockReturnValue({
      returning: projectReturning,
    });
    const membershipValues = vi.fn().mockResolvedValue(undefined);
    const onboardingOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const onboardingValues = vi.fn().mockReturnValue({
      onConflictDoNothing: onboardingOnConflictDoNothing,
    });

    const txMembershipLimit = vi.fn().mockResolvedValue([]);
    const txMembershipOrderBy = vi.fn().mockReturnValue({
      limit: txMembershipLimit,
    });
    const txMembershipWhere = vi.fn().mockReturnValue({
      orderBy: txMembershipOrderBy,
    });
    const txMembershipFrom = vi.fn().mockReturnValue({
      where: txMembershipWhere,
    });
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      insert: vi
        .fn()
        .mockReturnValueOnce({ values: organizationValues })
        .mockReturnValueOnce({ values: organizationValues })
        .mockReturnValueOnce({ values: projectValues })
        .mockReturnValueOnce({ values: membershipValues })
        .mockReturnValueOnce({ values: onboardingValues }),
      select: vi.fn().mockReturnValue({ from: txMembershipFrom }),
    };

    state.db.transaction.mockImplementation(async (callback) => callback(tx));

    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/workspace/init",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workspaceId: "org_test",
      projectId: "project_test",
      onboarding: {
        key: "dashboard_v1",
        isNewUser: true,
        shouldShow: true,
      },
    });
    expect(organizationValues).toHaveBeenNthCalledWith(1, {
      name: "Test User",
      slug: "test-user",
    });
    expect(organizationValues).toHaveBeenNthCalledWith(2, {
      name: "Test User",
      slug: "test-user-2",
    });
    expect(membershipValues).toHaveBeenCalledWith({
      organizationId: "org_test",
      userId: "user_test",
      role: "owner",
    });

    await app.close();
  });
});

function mockMembershipLookup(memberships: { organizationId: string }[]) {
  const membershipLimit = vi.fn().mockResolvedValue(memberships);
  const membershipOrderBy = vi.fn().mockReturnValue({
    limit: membershipLimit,
  });
  const membershipWhere = vi.fn().mockReturnValue({
    orderBy: membershipOrderBy,
  });
  const membershipFrom = vi.fn().mockReturnValue({
    where: membershipWhere,
  });

  state.db.select.mockReturnValueOnce({ from: membershipFrom });
}

function mockDefaultProjectAndOnboarding(projectId: string) {
  const defaultProjectLimit = vi.fn().mockResolvedValue([{ id: projectId }]);
  const defaultProjectWhere = vi.fn().mockReturnValue({
    limit: defaultProjectLimit,
  });
  const defaultProjectFrom = vi.fn().mockReturnValue({
    where: defaultProjectWhere,
  });
  const onboardingLimit = vi.fn().mockResolvedValue([]);
  const onboardingWhere = vi.fn().mockReturnValue({
    limit: onboardingLimit,
  });
  const onboardingFrom = vi.fn().mockReturnValue({
    where: onboardingWhere,
  });

  state.db.select
    .mockReturnValueOnce({ from: defaultProjectFrom })
    .mockReturnValueOnce({ from: onboardingFrom });
}

async function createApp() {
  const app = Fastify({ logger: false });

  await registerWorkspaceRoutes(app);

  return app;
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
