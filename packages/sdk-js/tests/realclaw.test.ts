import { describe, expect, it } from "vitest";

import {
  assertExactlyOneSafetyFlag,
  executeObservedCommand,
  findTransactionHash,
} from "../src/realclaw.js";

describe("openstat-realclaw", () => {
  it("rejects missing and conflicting safety flags", () => {
    expect(() =>
      assertExactlyOneSafetyFlag({ confirmed: false, previewOnly: false }),
    ).toThrow(/exactly one/u);
    expect(() =>
      assertExactlyOneSafetyFlag({ confirmed: true, previewOnly: true }),
    ).toThrow(/exactly one/u);
  });

  it("accepts one safety flag", () => {
    expect(() =>
      assertExactlyOneSafetyFlag({ confirmed: false, previewOnly: true }),
    ).not.toThrow();
    expect(() =>
      assertExactlyOneSafetyFlag({ confirmed: true, previewOnly: false }),
    ).not.toThrow();
  });

  it("extracts a full transaction hash", () => {
    const hash = `0x${"a".repeat(64)}`;

    expect(findTransactionHash(`Transaction: ${hash}`)).toBe(hash);
  });

  it("emits allowlisted telemetry for a confirmed fixture", async () => {
    const requests: Request[] = [];
    const originalFetch = globalThis.fetch;
    process.env.OPENSTAT_API_KEY = "ostat_test";
    process.env.OPENSTAT_ENDPOINT = "https://api.example.com";
    globalThis.fetch = async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(JSON.stringify({ accepted: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    try {
      await executeObservedCommand([
        "--fixture",
        "--confirm",
        "--run-id",
        "run_fixture",
        "--action",
        "mantle_send",
        "--",
        "fixture",
      ]);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.OPENSTAT_API_KEY;
      delete process.env.OPENSTAT_ENDPOINT;
    }

    expect(requests).toHaveLength(2);
    const [completion, transaction] = await Promise.all(
      requests.map((request) => request.json()),
    );

    expect(completion).toMatchObject({
      data: {
        status: "confirmed",
        summary: expect.stringContaining("mantle_send confirmed"),
      },
      run_id: "run_fixture",
      type: "completion",
    });
    expect(transaction).toMatchObject({
      data: {
        action: "mantle_send",
        chain_id: 5000,
        status: "submitted",
        tx_hash: `0x${"a".repeat(64)}`,
      },
      run_id: "run_fixture",
      type: "chain_transaction",
    });
    expect(JSON.stringify(completion)).not.toContain("ostat_test");
  });
});
