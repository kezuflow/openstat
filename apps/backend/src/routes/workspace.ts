import { schema } from "@openstat/db";
import { fromNodeHeaders } from "better-auth/node";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import { auth, database } from "../context.js";
import {
  errorResponseSchema,
  workspaceInitResponseSchema,
} from "../openapi/schemas.js";

const dashboardOnboardingKey = "dashboard_v1";

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.post(
    "/v1/workspace/init",
    {
      schema: {
        tags: ["Workspace"],
        summary: "Initialize the current user's workspace",
        response: {
          200: workspaceInitResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required.",
            requestId: request.id,
          },
        });
      }

      const existingMembership = await findFirstMembership(session.user.id);

      if (existingMembership) {
        const project = await ensureDefaultProject(
          existingMembership.organizationId,
        );
        const onboarding = await ensureDashboardOnboardingState(
          session.user.id,
          false,
        );

        return {
          workspaceId: existingMembership.organizationId,
          projectId: project.id,
          onboarding,
        };
      }

      const result = await database.db.transaction(async (tx) => {
        const workspaceSlug = await uniqueWorkspaceSlug(
          slugify(session.user.name || session.user.email || "workspace"),
        );

        const [workspace] = await tx
          .insert(schema.organizations)
          .values({
            name: session.user.name || "OpenStat Workspace",
            slug: workspaceSlug,
          })
          .returning();

        if (!workspace) {
          throw new Error("Failed to create workspace.");
        }

        const [project] = await tx
          .insert(schema.projects)
          .values({
            organizationId: workspace.id,
            name: "Default",
            slug: "default",
            isDefault: true,
          })
          .returning();

        if (!project) {
          throw new Error("Failed to create default project.");
        }

        await tx.insert(schema.memberships).values({
          organizationId: workspace.id,
          userId: session.user.id,
          role: "owner",
        });

        await tx
          .insert(schema.userOnboarding)
          .values({
            userId: session.user.id,
            key: dashboardOnboardingKey,
            firstShownAt: new Date(),
          })
          .onConflictDoNothing();

        return {
          workspaceId: workspace.id,
          projectId: project.id,
        };
      });

      return {
        ...result,
        onboarding: getInitialDashboardOnboardingState(),
      };
    },
  );
}

async function findFirstMembership(userId: string) {
  const [membership] = await database.db
    .select({
      organizationId: schema.memberships.organizationId,
    })
    .from(schema.memberships)
    .where(eq(schema.memberships.userId, userId))
    .orderBy(asc(schema.memberships.createdAt))
    .limit(1);

  return membership;
}

async function ensureDefaultProject(organizationId: string) {
  const [defaultProject] = await database.db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.organizationId, organizationId),
        eq(schema.projects.isDefault, true),
      ),
    )
    .limit(1);

  if (defaultProject) {
    return defaultProject;
  }

  const [existingProject] = await database.db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.organizationId, organizationId))
    .orderBy(asc(schema.projects.createdAt), asc(schema.projects.id))
    .limit(1);

  if (existingProject) {
    const [project] = await database.db
      .update(schema.projects)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, existingProject.id))
      .returning({ id: schema.projects.id });

    return project ?? existingProject;
  }

  const [project] = await database.db
    .insert(schema.projects)
    .values({
      organizationId,
      name: "Default",
      slug: "default",
      isDefault: true,
    })
    .returning({ id: schema.projects.id });

  if (!project) {
    throw new Error("Failed to create default project.");
  }

  return project;
}

async function ensureDashboardOnboardingState(
  userId: string,
  isNewUser: boolean,
) {
  await database.db
    .insert(schema.userOnboarding)
    .values({
      userId,
      key: dashboardOnboardingKey,
      firstShownAt: new Date(),
    })
    .onConflictDoNothing();

  const [onboarding] = await database.db
    .select({
      key: schema.userOnboarding.key,
    })
    .from(schema.userOnboarding)
    .where(
      and(
        eq(schema.userOnboarding.userId, userId),
        eq(schema.userOnboarding.key, dashboardOnboardingKey),
        isNull(schema.userOnboarding.completedAt),
        isNull(schema.userOnboarding.dismissedAt),
      ),
    )
    .limit(1);

  return {
    key: dashboardOnboardingKey,
    isNewUser,
    shouldShow: Boolean(onboarding),
  };
}

function getInitialDashboardOnboardingState() {
  return {
    key: dashboardOnboardingKey,
    isNewUser: true,
    shouldShow: true,
  };
}

async function uniqueWorkspaceSlug(baseSlug: string) {
  let candidate = baseSlug;
  let attempt = 1;

  while (await workspaceSlugExists(candidate)) {
    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }

  return candidate;
}

async function workspaceSlugExists(slug: string) {
  const [workspace] = await database.db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, slug))
    .limit(1);

  return Boolean(workspace);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 48) || "workspace"
  );
}
