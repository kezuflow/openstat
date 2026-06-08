import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";

import { auth } from "../context.js";
import { env } from "../config/env.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const url = new URL(request.url, env.apiPublicUrl);
      const body =
        request.body === undefined ? undefined : JSON.stringify(request.body);

      const authRequest = new Request(url.toString(), {
        method: request.method,
        headers: fromNodeHeaders(request.headers),
        body,
      });

      const response = await auth.handler(authRequest);

      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));

      const responseText = await response.text();

      return reply.send(responseText || null);
    },
  });

  app.get("/v1/me", async (request, reply) => {
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

    return reply.send(session);
  });
}
