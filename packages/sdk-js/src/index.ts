export type AgentInput = {
  id?: string;
  name?: string;
  tags?: string[];
};

export type OpenStatClientConfig = {
  apiKey: string;
  endpoint?: string;
  serviceName: string;
  environment?: string;
  defaultRedaction?: boolean;
  fetch?: typeof fetch;
};

export const DEFAULT_OPENSTAT_ENDPOINT = "https://api.openstat.online";

export type NativeEvent = {
  id?: string;
  schema_version?: 1;
  agent?: AgentInput;
  project_id?: string;
  type:
    | "chain_transaction"
    | "decision"
    | "risk_check"
    | "order"
    | "fill"
    | "position"
    | "pnl_snapshot"
    | "heartbeat"
    | "error"
    | "completion";
  data: Record<string, unknown>;
  timestamp?: number;
  trace_id?: string;
  span_id?: string;
  run_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type TradingIdentity = {
  strategy?: string;
  symbol: string;
  venue?: string;
};

export type EventContext = {
  agent?: AgentInput;
  runId?: string;
  traceId?: string;
  spanId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type StartAgentRunInput = {
  runId?: string;
  strategy?: string;
  metadata?: Record<string, unknown>;
};

export function createOpenStatClient(config: OpenStatClientConfig) {
  return new OpenStatClient(config);
}

export class OpenStatClient {
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;

  constructor(private readonly config: OpenStatClientConfig) {
    this.endpoint = (config.endpoint ?? DEFAULT_OPENSTAT_ENDPOINT).replace(
      /\/$/u,
      "",
    );
    this.fetcher = config.fetch ?? fetch;
  }

  startAgentRun(input: StartAgentRunInput = {}) {
    return {
      runId: input.runId ?? createId("run"),
      strategy: input.strategy,
      metadata: this.createMetadata(input.metadata),
    };
  }

  async sendEvent(event: NativeEvent) {
    const response = await this.fetcher(`${this.endpoint}/v1/ingest/events`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.prepareEvent(event)),
    });

    return parseResponse(response);
  }

  async sendBatch(events: NativeEvent[]) {
    const response = await this.fetcher(`${this.endpoint}/v1/ingest/batch`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        events: events.map((event) => this.prepareEvent(event)),
      }),
    });

    return parseResponse(response);
  }

  recordDecision(
    input: {
      action: string;
      confidence?: number;
      rationaleSummary?: string;
    } & EventContext &
      TradingIdentity,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "decision",
      data: {
        strategy: input.strategy,
        symbol: input.symbol,
        venue: input.venue,
        action: input.action,
        confidence: input.confidence,
        rationale_summary: input.rationaleSummary,
      },
    });
  }

  recordChainTransaction(
    input: {
      chain: string;
      chainId: number;
      txHash: `0x${string}`;
      action?: string;
      status?: "submitted" | "confirmed" | "reverted";
      fromAddress?: `0x${string}`;
      toAddress?: `0x${string}`;
    } & EventContext,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "chain_transaction",
      data: {
        chain: input.chain,
        chain_id: input.chainId,
        tx_hash: input.txHash,
        action: input.action,
        status: input.status,
        from_address: input.fromAddress,
        to_address: input.toAddress,
      },
    });
  }

  recordRiskCheck(
    input: {
      decisionId?: string;
      result: "approved" | "rejected" | "warn";
      reason?: string;
    } & EventContext,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "risk_check",
      data: {
        decision_id: input.decisionId,
        result: input.result,
        reason: input.reason,
      },
    });
  }

  recordOrder(
    input: {
      orderId?: string;
      decisionId?: string;
      side: "buy" | "sell";
      orderType: "market" | "limit" | "stop" | "stop_limit";
      quantity: string | number;
      price?: string | number;
      status?:
        | "pending"
        | "submitted"
        | "partially_filled"
        | "filled"
        | "cancelled"
        | "rejected"
        | "failed";
    } & EventContext &
      TradingIdentity,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "order",
      data: {
        order_id: input.orderId,
        decision_id: input.decisionId,
        strategy: input.strategy,
        symbol: input.symbol,
        venue: input.venue,
        side: input.side,
        order_type: input.orderType,
        quantity: input.quantity,
        price: input.price,
        status: input.status,
      },
    });
  }

  recordFill(
    input: {
      fillId?: string;
      orderId?: string;
      side: "buy" | "sell";
      quantity: string | number;
      price: string | number;
      fee?: string | number;
      status?: "partial" | "filled" | "cancelled";
    } & EventContext &
      TradingIdentity,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "fill",
      data: {
        fill_id: input.fillId,
        order_id: input.orderId,
        strategy: input.strategy,
        symbol: input.symbol,
        venue: input.venue,
        side: input.side,
        quantity: input.quantity,
        price: input.price,
        fee: input.fee,
        status: input.status,
      },
    });
  }

  recordPosition(
    input: {
      quantity: string | number;
      averagePrice?: string | number;
    } & EventContext &
      TradingIdentity,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "position",
      data: {
        strategy: input.strategy,
        symbol: input.symbol,
        venue: input.venue,
        quantity: input.quantity,
        average_price: input.averagePrice,
      },
    });
  }

  recordPnlSnapshot(
    input: {
      strategy?: string;
      symbol?: string;
      realizedPnl?: string | number;
      unrealizedPnl?: string | number;
      equity?: string | number;
    } & EventContext,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "pnl_snapshot",
      data: {
        strategy: input.strategy,
        symbol: input.symbol,
        realized_pnl: input.realizedPnl,
        unrealized_pnl: input.unrealizedPnl,
        equity: input.equity,
      },
    });
  }

  sendHeartbeat(
    input: {
      status?: "online" | "stale" | "offline" | "failing" | "unknown";
      expectedCheckInSeconds?: number;
      summary?: string;
    } & EventContext = {},
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "heartbeat",
      data: {
        status: input.status ?? "online",
        expected_check_in_seconds: input.expectedCheckInSeconds,
        summary: input.summary,
      },
    });
  }

  recordError(
    input: {
      code?: string;
      message: string;
      retryable?: boolean;
    } & EventContext,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "error",
      data: {
        code: input.code,
        message: input.message,
        retryable: input.retryable,
      },
    });
  }

  recordModelUsage(
    input: {
      provider?: string;
      model?: string;
      status?: string;
      latencyMs?: number;
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      summary?: string;
    } & EventContext,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "completion",
      data: {
        provider: input.provider,
        model: input.model,
        status: input.status,
        latency_ms: input.latencyMs,
        usage: {
          input_tokens: input.inputTokens,
          output_tokens: input.outputTokens,
          total_tokens: input.totalTokens,
        },
        summary: input.summary,
      },
    });
  }

  recordToolCall(
    input: {
      toolName: string;
      status?: string;
      summary?: string;
    } & EventContext,
  ) {
    return this.sendEvent({
      ...this.createEventContext(input),
      type: "completion",
      data: {
        status: input.status,
        summary: input.summary,
      },
      metadata: {
        ...input.metadata,
        tool_name: input.toolName,
      },
    });
  }

  createOpenTelemetryHttpConfig() {
    return createOpenTelemetryHttpConfig(this.config);
  }

  private prepareEvent(event: NativeEvent): NativeEvent {
    return {
      schema_version: 1,
      ...event,
      metadata: this.createMetadata(event.metadata),
      timestamp: event.timestamp ?? Date.now(),
    };
  }

  private createMetadata(metadata: Record<string, unknown> = {}) {
    return {
      ...metadata,
      service_name: this.config.serviceName,
      environment: this.config.environment,
      redaction_enabled: this.config.defaultRedaction ?? true,
    };
  }

  private headers() {
    return {
      authorization: `Bearer ${this.config.apiKey}`,
      "content-type": "application/json",
      "x-openstat-source": "sdk",
    };
  }

  private createEventContext(input: EventContext) {
    return {
      agent: input.agent,
      run_id: input.runId,
      trace_id: input.traceId,
      span_id: input.spanId,
      tags: input.tags,
      metadata: input.metadata,
    };
  }
}

export function createOpenTelemetryHttpConfig(config: OpenStatClientConfig) {
  const endpoint = (config.endpoint ?? DEFAULT_OPENSTAT_ENDPOINT).replace(
    /\/$/u,
    "",
  );
  const headers = {
    authorization: `Bearer ${config.apiKey}`,
  };

  return {
    serviceName: config.serviceName,
    environment: config.environment,
    traces: {
      url: `${endpoint}/v1/traces`,
      headers,
    },
    logs: {
      url: `${endpoint}/v1/logs`,
      headers,
    },
    metrics: {
      url: `${endpoint}/v1/metrics`,
      headers,
    },
  };
}

async function parseResponse(response: Response) {
  const body = (await response.json().catch(() => undefined)) as unknown;

  if (!response.ok) {
    throw new OpenStatApiError(response.status, body);
  }

  return body;
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

export class OpenStatApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`OpenStat API request failed with status ${status}.`);
    this.name = "OpenStatApiError";
  }
}
