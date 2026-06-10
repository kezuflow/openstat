# Tencent Cloud Mantle Proof Verifier

This folder is the Tencent Cloud integration for the Mantle Turing AI DevTools
submission.

It contains a dependency-free Tencent Cloud Serverless Cloud Function (SCF) that
verifies an OpenStat Mantle proof transaction directly against Mantle Sepolia
RPC. The function is intentionally small: Tencent Cloud runs the verification
endpoint, Mantle remains the on-chain proof layer, and OpenStat remains the
agent telemetry and audit system.

## What It Verifies

The function accepts a `runId` or `txHash`, fetches the Mantle Sepolia
transaction receipt, and checks that:

- the receipt exists and is confirmed;
- the transaction emitted `AuditAnchored(...)`;
- the event came from the configured `OpenStatAuditAnchor` contract;
- the event includes the submitter, run reference, telemetry digest, insight
  digest, outcome, and anchor timestamp.

The default demo proof is:

```text
runId: mantle-demo-run
txHash: 0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b
contract: 0x1f5a3354dc01beb89ba7de1a01d04295274a737a
network: Mantle Sepolia
```

## Local Test

From the repository root:

```sh
node deploy/tencent-cloud/proof-verifier/local-invoke.js mantle-demo-run
```

Expected output includes:

```json
{
  "verified": true,
  "network": "Mantle Sepolia",
  "receiptStatus": "confirmed",
  "audit": {
    "outcomeLabel": "pass"
  },
  "source": "tencent-cloud-scf"
}
```

Live Tencent Cloud deployment:

```text
https://1442161061-1eo7ds24yh.eu-frankfurt.tencentscf.com?runId=mantle-demo-run
```

## Tencent Cloud SCF Deployment

Tencent Cloud SCF can be deployed through the console, Serverless Cloud
Framework, or TencentCloud API. The function is compatible with the standard
Node.js handler shape shown in Tencent Cloud's SCF documentation:
`index.main_handler`.

### Console Path

1. Open Tencent Cloud Console.
2. Go to **Serverless Cloud Function**.
3. Create a function named `openstat-mantle-proof-verifier`.
4. Choose a Node.js runtime. If several runtimes are available, choose the
   newest Node.js runtime shown by the console.
5. Upload or paste `deploy/tencent-cloud/proof-verifier/index.js`.
6. Set handler to:

```text
index.main_handler
```

7. Add these environment variables:

```text
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
MANTLE_CHAIN_ID=5003
MANTLE_EXPLORER_BASE_URL=https://sepolia.mantlescan.xyz
OPENSTAT_AUDIT_ANCHOR_CONTRACT_ADDRESS=0x1f5a3354dc01beb89ba7de1a01d04295274a737a
PROOF_TX_BY_RUN_ID={"mantle-demo-run":"0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b"}
```

8. Enable a Function URL or API Gateway trigger.
9. Test with:

```sh
curl "https://<your-function-url>?runId=mantle-demo-run"
```

### Serverless Framework Starter

`serverless.yml` is included as a starter manifest for Tencent Cloud SCF's
`scf` component. Update `region` if needed, then deploy using the Tencent Cloud
serverless workflow configured for your account.

Do not commit Tencent Cloud `SecretId`, `SecretKey`, API keys, or console export
files.

## Why This Exists

The AI DevTools scorecard includes **Tencent Cloud and Mantle integration
depth**. This function provides a real integration point:

- Tencent Cloud hosts the proof-verification DevTool endpoint.
- Mantle provides the on-chain proof transaction and contract event.
- OpenStat provides the agent run, audit output, digest model, and dashboard.

This is not a fake sponsor mention. It is a small, reproducible verifier that a
judge can deploy, invoke, and compare against the public MantleScan transaction.
