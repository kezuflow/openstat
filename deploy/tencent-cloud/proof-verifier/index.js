"use strict";

const https = require("https");

const DEFAULT_CHAIN_ID = 5003;
const DEFAULT_CONTRACT_ADDRESS = "0x1f5a3354dc01beb89ba7de1a01d04295274a737a";
const DEFAULT_RPC_URL = "https://rpc.sepolia.mantle.xyz";
const DEFAULT_EXPLORER_URL = "https://sepolia.mantlescan.xyz";
const DEFAULT_RUN_ID = "mantle-demo-run";
const DEFAULT_PROOF_TX_HASH =
  "0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b";
const AUDIT_ANCHORED_TOPIC =
  "0x802404c22a939927f18caa4bb4a3cce5f22a2a9ddb6595887a98754e97ebb6e5";

const outcomeLabels = ["unknown", "pass", "warning", "fail"];

exports.main_handler = async function mainHandler(event) {
  if (isOptionsRequest(event)) {
    return response(204, "");
  }

  try {
    const input = parseInput(event);
    const runId = input.runId || DEFAULT_RUN_ID;
    const txHash = normalizeHash(input.txHash || getTxHashForRun(runId));

    if (!txHash) {
      return response(400, {
        error: "MISSING_PROOF_REFERENCE",
        message: "Pass txHash or a runId configured in PROOF_TX_BY_RUN_ID.",
      });
    }

    const verification = await verifyMantleProofTransaction(txHash);

    return response(200, {
      ...verification,
      requestedRunId: runId,
      source: "tencent-cloud-scf",
      service: "openstat-mantle-proof-verifier",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    return response(500, {
      error: "PROOF_VERIFICATION_FAILED",
      message: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

async function verifyMantleProofTransaction(txHash) {
  const contractAddress = normalizeAddress(
    process.env.OPENSTAT_AUDIT_ANCHOR_CONTRACT_ADDRESS ||
      DEFAULT_CONTRACT_ADDRESS,
  );
  const chainId = Number(process.env.MANTLE_CHAIN_ID || DEFAULT_CHAIN_ID);
  const explorerBaseUrl =
    process.env.MANTLE_EXPLORER_BASE_URL || DEFAULT_EXPLORER_URL;
  const rpcUrl = process.env.MANTLE_RPC_URL || DEFAULT_RPC_URL;
  const receipt = await rpc(rpcUrl, "eth_getTransactionReceipt", [txHash]);

  if (!receipt) {
    return {
      verified: false,
      reason: "Transaction receipt not found.",
      network: networkName(chainId),
      chainId,
      contractAddress,
      txHash,
      explorerUrl: `${explorerBaseUrl}/tx/${txHash}`,
    };
  }

  const matchingLog = (receipt.logs || []).find((log) => {
    const address = normalizeAddress(log.address);
    const topic0 = String((log.topics || [])[0] || "").toLowerCase();

    return address === contractAddress && topic0 === AUDIT_ANCHORED_TOPIC;
  });

  if (!matchingLog) {
    return {
      verified: false,
      reason:
        "No OpenStat AuditAnchored event found for the configured contract.",
      network: networkName(chainId),
      chainId,
      contractAddress,
      txHash,
      receiptStatus: receipt.status === "0x1" ? "confirmed" : "reverted",
      blockNumber: hexToString(receipt.blockNumber),
      explorerUrl: `${explorerBaseUrl}/tx/${txHash}`,
    };
  }

  const decoded = decodeAuditAnchoredLog(matchingLog);
  const receiptConfirmed = receipt.status === "0x1";

  return {
    verified: receiptConfirmed && decoded.outcomeLabel !== "unknown",
    network: networkName(chainId),
    chainId,
    contractAddress,
    txHash,
    explorerUrl: `${explorerBaseUrl}/tx/${txHash}`,
    receiptStatus: receiptConfirmed ? "confirmed" : "reverted",
    blockNumber: hexToString(receipt.blockNumber),
    gasUsed: hexToString(receipt.gasUsed),
    audit: decoded,
  };
}

function decodeAuditAnchoredLog(log) {
  const topics = log.topics || [];
  const data = String(log.data || "").replace(/^0x/u, "");

  if (topics.length < 4 || data.length < 192) {
    throw new Error("AuditAnchored log is incomplete.");
  }

  const submitter = topicToAddress(topics[1]);
  const runRef = normalizeHash(topics[2]);
  const telemetryDigest = normalizeHash(topics[3]);
  const insightDigest = normalizeHash(`0x${data.slice(0, 64)}`);
  const outcome = Number(BigInt(`0x${data.slice(64, 128)}`));
  const anchoredAt = Number(BigInt(`0x${data.slice(128, 192)}`));

  return {
    submitter,
    runRef,
    telemetryDigest,
    insightDigest,
    outcome,
    outcomeLabel: outcomeLabels[outcome] || "unknown",
    anchoredAtUnix: anchoredAt,
    anchoredAt: new Date(anchoredAt * 1000).toISOString(),
  };
}

function parseInput(event) {
  if (!event || typeof event !== "object") {
    return {};
  }

  const direct = {
    runId: event.runId || event.run_id,
    txHash: event.txHash || event.tx_hash,
  };
  const query = parseQuery(event);
  const body = parseBody(event);

  return {
    runId:
      body.runId || body.run_id || query.runId || query.run_id || direct.runId,
    txHash:
      body.txHash ||
      body.tx_hash ||
      query.txHash ||
      query.tx_hash ||
      direct.txHash,
  };
}

function parseQuery(event) {
  const query =
    event.queryStringParameters || event.queryString || event.query || {};

  if (typeof query === "string") {
    return Object.fromEntries(new URLSearchParams(query));
  }

  return query && typeof query === "object" ? query : {};
}

function parseBody(event) {
  if (!event.body || typeof event.body !== "string") {
    return {};
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    return JSON.parse(body);
  } catch (_error) {
    return {};
  }
}

function getTxHashForRun(runId) {
  const configured = parseProofMap(process.env.PROOF_TX_BY_RUN_ID);

  return (
    configured[runId] || (runId === DEFAULT_RUN_ID ? DEFAULT_PROOF_TX_HASH : "")
  );
}

function parseProofMap(value) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function rpc(rpcUrl, method, params) {
  const payload = JSON.stringify({
    id: Date.now(),
    jsonrpc: "2.0",
    method,
    params,
  });
  const url = new URL(rpcUrl);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: url.hostname,
        method: "POST",
        path: `${url.pathname}${url.search}`,
        port: url.port || 443,
        protocol: url.protocol,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
        timeout: Number(process.env.MANTLE_RPC_TIMEOUT_MS || 8000),
      },
      (res) => {
        const chunks = [];

        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));

            if (body.error) {
              reject(
                new Error(
                  body.error.message || "Mantle RPC returned an error.",
                ),
              );
              return;
            }

            resolve(body.result);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("timeout", () =>
      request.destroy(new Error("Mantle RPC timed out.")),
    );
    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function response(statusCode, body) {
  return {
    isBase64Encoded: false,
    statusCode,
    headers: {
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    },
    body: typeof body === "string" ? body : JSON.stringify(body, null, 2),
  };
}

function isOptionsRequest(event) {
  const requestContext =
    event && event.requestContext ? event.requestContext : {};
  const requestHttp = requestContext.http || {};
  const method =
    event && (event.httpMethod || requestHttp.method || requestContext.method);

  return String(method || "").toUpperCase() === "OPTIONS";
}

function normalizeAddress(value) {
  return String(value || "").toLowerCase();
}

function normalizeHash(value) {
  const hash = String(value || "").toLowerCase();

  return /^0x[0-9a-f]{64}$/u.test(hash) ? hash : "";
}

function topicToAddress(topic) {
  return `0x${String(topic || "")
    .slice(-40)
    .toLowerCase()}`;
}

function hexToString(value) {
  return value ? BigInt(value).toString() : undefined;
}

function networkName(chainId) {
  return chainId === 5003 ? "Mantle Sepolia" : `Mantle chain ${chainId}`;
}
