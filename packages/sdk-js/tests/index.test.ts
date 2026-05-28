import { describe, expect, it } from "vitest";

import {
  OpenStatApiError,
  createOpenStatClient,
  createOpenTelemetryHttpConfig,
  type NativeEvent,
} from "../src/index.js";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

describe("OpenStatClient", () => {
  it("emits decision events with auth and service metadata", async () => {
    const requests: Request[] = [];
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      endpoint: "https://api.example.com/",
      serviceName: "vitest-agent",
      environment: "test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return createJsonResponse({ accepted: true });
      },
    });

    await expect(
      client.recordDecision({
        agent: { id: "agent-test" },
        strategy: "breakout",
        symbol: "BTC-USD",
        action: "enter_long",
      }),
    ).resolves.toEqual({ accepted: true });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("https://api.example.com/v1/ingest/events");
    expect(requests[0].headers.get("authorization")).toBe("Bearer ostat_public_secret");

    const body = (await requests[0].json()) as NativeEvent;
    expect(body.type).toBe("decision");
    expect(body.schema_version).toBe(1);
    expect(body.metadata).toMatchObject({
      service_name: "vitest-agent",
      environment: "test",
      redaction_enabled: true,
    });
    expect(body.data).toMatchObject({
      strategy: "breakout",
      symbol: "BTC-USD",
      action: "enter_long",
    });
  });

  it("sends prepared batches to the batch endpoint", async () => {
    const requests: Request[] = [];
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      endpoint: "https://api.example.com",
      serviceName: "batch-agent",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return createJsonResponse({ accepted: true, acceptedCount: 1 });
      },
    });

    await client.sendBatch([
      {
        type: "heartbeat",
        data: { status: "online" },
      },
    ]);

    const body = (await requests[0].json()) as { events: NativeEvent[] };
    expect(requests[0].url).toBe("https://api.example.com/v1/ingest/batch");
    expect(body.events[0]).toMatchObject({
      schema_version: 1,
      type: "heartbeat",
      metadata: {
        service_name: "batch-agent",
        redaction_enabled: true,
      },
    });
  });

  it("throws OpenStatApiError for non-2xx responses", async () => {
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      serviceName: "error-agent",
      fetch: async () =>
        createJsonResponse(
          { error: { code: "INVALID_API_KEY", message: "Invalid API key." } },
          { status: 401 },
        ),
    });

    await expect(client.sendEvent({ type: "heartbeat", data: {} })).rejects.toMatchObject({
      name: "OpenStatApiError",
      status: 401,
      body: { error: { code: "INVALID_API_KEY", message: "Invalid API key." } },
    } satisfies Partial<OpenStatApiError>);
  });
});

describe("createOpenTelemetryHttpConfig", () => {
  it("returns OTLP HTTP targets with authorization headers", () => {
    const config = createOpenTelemetryHttpConfig({
      apiKey: "ostat_public_secret",
      endpoint: "https://api.example.com/",
      serviceName: "otel-agent",
      environment: "production",
    });

    expect(config).toEqual({
      serviceName: "otel-agent",
      environment: "production",
      traces: {
        url: "https://api.example.com/v1/traces",
        headers: { authorization: "Bearer ostat_public_secret" },
      },
      logs: {
        url: "https://api.example.com/v1/logs",
        headers: { authorization: "Bearer ostat_public_secret" },
      },
      metrics: {
        url: "https://api.example.com/v1/metrics",
        headers: { authorization: "Bearer ostat_public_secret" },
      },
    });
  });
});
