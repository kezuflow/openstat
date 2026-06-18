import { schema } from "@openstat/db";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { auth, database } from "../context.js";
import {
  errorResponseSchema,
  updateDashboardOnboardingBodySchema,
  updateDashboardOnboardingResponseSchema,
} from "../openapi/schemas.js";

const dashboardOnboardingKey = "dashboard_v1";

const updateDashboardOnboardingSchema = z.object({
  status: z.enum(["completed", "dismissed"]),
});

export async function registerOnboardingRoutes(app: FastifyInstance) {
  app.patch(
    "/v1/onboarding/dashboard",
    {
      schema: {
        tags: ["Workspace"],
        summary: "Update dashboard onboarding state for the current user",
        body: updateDashboardOnboardingBodySchema,
        response: {
          200: updateDashboardOnboardingResponseSchema,
          400: errorResponseSchema,
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

      const input = updateDashboardOnboardingSchema.parse(request.body ?? {});
      const now = new Date();
      const statusPatch =
        input.status === "completed"
          ? { completedAt: now }
          : { dismissedAt: now };

      await database.db
        .insert(schema.userOnboarding)
        .values({
          userId: session.user.id,
          key: dashboardOnboardingKey,
          firstShownAt: now,
          ...statusPatch,
        })
        .onConflictDoUpdate({
          target: [schema.userOnboarding.userId, schema.userOnboarding.key],
          set: {
            ...statusPatch,
            updatedAt: now,
          },
        });

      return {
        onboarding: {
          key: dashboardOnboardingKey,
          isNewUser: false,
          shouldShow: false,
        },
      };
    },
  );
}
