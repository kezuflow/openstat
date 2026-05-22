import { redactTelemetryPayload } from "@openstat/ingestion";
import { describe, expect, it } from "vitest";

describe("telemetry redaction", () => {
  it("redacts sensitive payload fields by default while preserving projections", () => {
    const redacted = redactTelemetryPayload({
      type: "order",
      data: {
        strategy: "breakout",
        symbol: "BTC-USD",
        side: "buy",
        order_type: "limit",
        quantity: "0.25",
        price: "62500",
        rationale_summary: "Safe summary stays readable.",
        prompt: "secret trading prompt",
        tool_args: {
          privateAccountId: "acct_123",
        },
        raw_order_payload: {
          brokerAccountId: "broker_acct_456",
          nested: {
            authorization: "Bearer secret",
          },
        },
      },
      metadata: {
        provider: "openai",
        model: "gpt-5.4",
        prompt_hash: "sha256:abc",
        api_key: "secret",
      },
    });

    expect(redacted.data).toEqual(
      expect.objectContaining({
        strategy: "breakout",
        symbol: "BTC-USD",
        side: "buy",
        order_type: "limit",
        quantity: "0.25",
        price: "62500",
        rationale_summary: "Safe summary stays readable.",
        prompt: "[REDACTED]",
        tool_args: "[REDACTED]",
        raw_order_payload: "[REDACTED]",
      }),
    );
    expect(redacted.metadata).toEqual(
      expect.objectContaining({
        provider: "openai",
        model: "gpt-5.4",
        prompt_hash: "sha256:abc",
        api_key: "[REDACTED]",
      }),
    );
  });

  it("allows raw capture only when explicitly enabled", () => {
    const payload = {
      data: {
        prompt: "raw prompt",
        tool_result: "raw tool result",
      },
    };

    expect(redactTelemetryPayload(payload).data).toEqual({
      prompt: "[REDACTED]",
      tool_result: "[REDACTED]",
    });
    expect(
      redactTelemetryPayload(payload, { raw_capture_enabled: true }),
    ).toEqual(payload);
  });
});
