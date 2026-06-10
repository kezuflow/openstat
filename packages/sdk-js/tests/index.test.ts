import { describe, expect, it } from "vitest";

import {
  DEFAULT_OPENSTAT_ENDPOINT,
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
  it("uses the hosted API endpoint by default", async () => {
    const requests: Request[] = [];
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      serviceName: "vitest-agent",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return createJsonResponse({ accepted: true });
      },
    });

    await client.sendHeartbeat();

    expect(requests[0].url).toBe(
      `${DEFAULT_OPENSTAT_ENDPOINT}/v1/ingest/events`,
    );
  });

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
    expect(requests[0].headers.get("authorization")).toBe(
      "Bearer ostat_public_secret",
    );
    expect(requests[0].headers.get("x-openstat-source")).toBe("sdk");

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
    expect(requests[0].headers.get("x-openstat-source")).toBe("sdk");
    expect(body.events[0]).toMatchObject({
      schema_version: 1,
      type: "heartbeat",
      metadata: {
        service_name: "batch-agent",
        redaction_enabled: true,
      },
    });
  });

  it("sends Mantle proof telemetry through native batches", async () => {
    const requests: Request[] = [];
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      endpoint: "https://api.example.com",
      serviceName: "audit-copilot",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return createJsonResponse({ accepted: true, acceptedCount: 3 });
      },
    });
    const metadata = {
      action: "anchor_audit",
      chain: "mantle",
      network: "sepolia",
      product: "openstat-mantle-turing",
      run_id: "mantle-demo-run",
    };

    await client.sendBatch([
      {
        type: "risk_check",
        run_id: "mantle-demo-run",
        data: {
          audit_score: 0,
          result: "pass",
          summary: "Audit Copilot found no policy violations.",
        },
        metadata,
        tags: ["mantle", "audit"],
      },
      {
        type: "audit_insight",
        run_id: "mantle-demo-run",
        data: {
          checks: ["strategy_present", "risk_gate_passed"],
          summary: "Run is ready for Mantle proof anchoring.",
          verdict: "passed",
        },
        metadata,
        tags: ["mantle", "audit"],
      },
      {
        type: "chain_transaction",
        run_id: "mantle-demo-run",
        data: {
          action: "anchor_audit",
          chain: "mantle",
          chain_id: 5003,
          network: "sepolia",
          status: "confirmed",
          tx_hash:
            "0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b",
        },
        metadata,
        tags: ["mantle", "proof"],
      },
    ]);

    const body = (await requests[0].json()) as { events: NativeEvent[] };
    expect(body.events.map((event) => event.type)).toEqual([
      "risk_check",
      "audit_insight",
      "chain_transaction",
    ]);
    expect(body.events[0]?.metadata).toMatchObject({
      chain: "mantle",
      service_name: "audit-copilot",
    });
    expect(body.events[2]?.data).toMatchObject({
      chain: "mantle",
      tx_hash:
        "0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b",
    });
  });

  it("emits run lifecycle completion events", async () => {
    const requests: Request[] = [];
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      serviceName: "vitest-agent",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return createJsonResponse({ accepted: true });
      },
    });

    await client.recordRunLifecycle({
      agent: { id: "agent-test", name: "Agent Test" },
      runId: "run-test",
      status: "completed",
      strategy: "breakout",
      symbols: ["BTC-USD"],
      summary: "Run completed.",
    });

    const body = (await requests[0].json()) as NativeEvent;
    expect(body).toMatchObject({
      agent: { id: "agent-test", name: "Agent Test" },
      run_id: "run-test",
      type: "completion",
      data: {
        status: "completed",
        summary: "Run completed.",
      },
      metadata: {
        kind: "run_lifecycle",
        run_status: "completed",
        strategy: "breakout",
        symbols: ["BTC-USD"],
        service_name: "vitest-agent",
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

    await expect(
      client.sendEvent({ type: "heartbeat", data: {} }),
    ).rejects.toMatchObject({
      name: "OpenStatApiError",
      status: 401,
      body: { error: { code: "INVALID_API_KEY", message: "Invalid API key." } },
    } satisfies Partial<OpenStatApiError>);
  });

  it("emits position and error events with shared context", async () => {
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

    await client.recordPosition({
      agent: { id: "agent-test" },
      runId: "run-test",
      traceId: "trace-test",
      spanId: "span-test",
      tags: ["paper"],
      metadata: { exchange: "test" },
      strategy: "breakout",
      symbol: "BTC-USD",
      venue: "paper",
      quantity: "0.10",
      averagePrice: "62500",
    });
    await client.recordError({
      agent: { id: "agent-test" },
      runId: "run-test",
      code: "BROKER_TIMEOUT",
      message: "Broker request timed out.",
      retryable: true,
    });

    const position = (await requests[0].json()) as NativeEvent;
    const error = (await requests[1].json()) as NativeEvent;

    expect(position).toMatchObject({
      agent: { id: "agent-test" },
      run_id: "run-test",
      trace_id: "trace-test",
      span_id: "span-test",
      tags: ["paper"],
      metadata: {
        environment: "test",
        exchange: "test",
        redaction_enabled: true,
        service_name: "vitest-agent",
      },
      type: "position",
      data: {
        average_price: "62500",
        quantity: "0.10",
        strategy: "breakout",
        symbol: "BTC-USD",
        venue: "paper",
      },
    });
    expect(error).toMatchObject({
      type: "error",
      data: {
        code: "BROKER_TIMEOUT",
        message: "Broker request timed out.",
        retryable: true,
      },
    });
  });

  it("emits supported order, fill, PnL, and model usage fields", async () => {
    const requests: Request[] = [];
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      serviceName: "vitest-agent",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return createJsonResponse({ accepted: true });
      },
    });

    await client.recordOrder({
      decisionId: "decision-test",
      symbol: "BTC-USD",
      side: "buy",
      orderType: "limit",
      quantity: "0.10",
    });
    await client.recordFill({
      symbol: "BTC-USD",
      side: "buy",
      quantity: "0.10",
      price: "62500",
      status: "partial",
    });
    await client.recordPnlSnapshot({
      runId: "run-test",
      equity: "10000",
    });
    await client.recordModelUsage({
      totalTokens: 42,
    });

    const bodies = await Promise.all(
      requests.map(async (request) => (await request.json()) as NativeEvent),
    );

    expect(bodies[0].data).toMatchObject({ decision_id: "decision-test" });
    expect(bodies[1].data).toMatchObject({ status: "partial" });
    expect(bodies[2]).toMatchObject({ run_id: "run-test" });
    expect(bodies[3].data).toMatchObject({ usage: { total_tokens: 42 } });
  });

  it("emits Mantle transaction telemetry with run context", async () => {
    const requests: Request[] = [];
    const client = createOpenStatClient({
      apiKey: "ostat_public_secret",
      serviceName: "mantle-agent",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return createJsonResponse({ accepted: true });
      },
    });

    await client.recordChainTransaction({
      agent: { id: "agent-mantle" },
      runId: "run-mantle",
      chain: "mantle",
      chainId: 5003,
      txHash: `0x${"a".repeat(64)}`,
      action: "anchor_audit",
      status: "submitted",
      fromAddress: `0x${"b".repeat(40)}`,
      toAddress: `0x${"c".repeat(40)}`,
    });

    const body = (await requests[0].json()) as NativeEvent;
    expect(body).toMatchObject({
      agent: { id: "agent-mantle" },
      run_id: "run-mantle",
      type: "chain_transaction",
      data: {
        action: "anchor_audit",
        chain: "mantle",
        chain_id: 5003,
        from_address: `0x${"b".repeat(40)}`,
        status: "submitted",
        to_address: `0x${"c".repeat(40)}`,
        tx_hash: `0x${"a".repeat(64)}`,
      },
    });
  });
});

describe("createOpenTelemetryHttpConfig", () => {
  it("uses the hosted API endpoint by default", () => {
    const config = createOpenTelemetryHttpConfig({
      apiKey: "ostat_public_secret",
      serviceName: "otel-agent",
    });

    expect(config.traces.url).toBe(`${DEFAULT_OPENSTAT_ENDPOINT}/v1/traces`);
    expect(config.logs.url).toBe(`${DEFAULT_OPENSTAT_ENDPOINT}/v1/logs`);
    expect(config.metrics.url).toBe(`${DEFAULT_OPENSTAT_ENDPOINT}/v1/metrics`);
  });

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
