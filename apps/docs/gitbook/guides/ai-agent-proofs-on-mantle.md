# AI Agent Proofs on Mantle

OpenStat can turn an AI-agent run into a verifiable audit trail. The first
on-chain proof integration is built for the Mantle ecosystem, with support for
additional chains planned soon.

The Mantle integration records what an agent attempted, verifies related Mantle
transaction receipts, produces a redacted AI audit verdict, and anchors a
privacy-safe proof on Mantle Sepolia.

The on-chain component is `OpenStatAuditAnchor`. It is not a trading bot and it
does not re-execute agent transactions. It acts as an immutable proof registry
for OpenStat audits.

## Quick summary

OpenStat connects three things into one audit trail:

- agent telemetry: what the AI agent tried to do
- Mantle receipt data: what Mantle says happened for the submitted transaction
- on-chain audit proof: a public commitment to the redacted OpenStat audit

The dashboard shows the correlated agent run, receipt status, AI audit outcome,
proof status, and Mantle Explorer links.

## How it works

```text
AI agent run
  -> OpenStat telemetry
  -> Mantle receipt verification
  -> redacted Audit Copilot verdict
  -> telemetryDigest + insightDigest
  -> OpenStatAuditAnchor.anchorAudit(...)
  -> public Mantle proof transaction
```

When an agent submits a Mantle transaction, OpenStat stores the run context and
checks the transaction hash through Mantle RPC. The dashboard can then show the
receipt status, block number, gas used, and explorer link beside the agent run.

After the receipt is reconciled, Audit Copilot analyzes only redacted run
context and emits a structured verdict. OpenStat hashes the redacted telemetry
and the AI insight, then calls `anchorAudit(...)` with:

- `runRef`: a bytes32 reference for the audited run
- `telemetryDigest`: hash of the redacted run-audit input
- `insightDigest`: hash of the structured AI audit verdict
- `outcome`: `0` unknown, `1` pass, `2` warning, or `3` fail

Only these commitments and the outcome are written on-chain. Raw prompts,
wallet secrets, private account details, and unredacted telemetry stay out of
public chain data.

## The on-chain transaction

OpenStat anchors audit commitments through `OpenStatAuditAnchor` on Mantle
Sepolia.

- Contract:
  [`0x1f5a3354dc01beb89ba7de1a01d04295274a737a`](https://sepolia.mantlescan.xyz/address/0x1f5a3354dc01beb89ba7de1a01d04295274a737a)
- Deployment transaction:
  [`0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956`](https://sepolia.mantlescan.xyz/tx/0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956)
- Audit proof transaction:
  [`0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b`](https://sepolia.mantlescan.xyz/tx/0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b)
- Network: Mantle Sepolia
- Contract function: `anchorAudit(...)`
- Outcome: `pass`

The audit proof transaction is the public on-chain record. It shows that
OpenStat wrote a redacted audit commitment to Mantle Sepolia. Anyone can inspect
that transaction and the verified contract on Mantle Explorer.

## What the proof means

The proof confirms that an OpenStat audit existed for a specific agent run and
that the displayed redacted audit can be matched to an on-chain commitment.

The proof does not mean the smart contract independently decided to trade,
inspected private prompts, or executed the agent's transaction. Transaction
execution and receipt verification happen off-chain through the agent workflow
and Mantle RPC. Mantle stores the final audit commitment so the proof can be
publicly checked later.

## Dashboard proof view

Open the dashboard proof view:

[https://openstat.online/dashboard/onchain/mantle](https://openstat.online/dashboard/onchain/mantle)

The Mantle dashboard shows:

- the agent run associated with the audit
- the submitted Mantle transaction receipt status
- the AI audit verdict from Audit Copilot
- whether the audit was anchored
- direct Mantle Explorer links for the transaction and proof

The dashboard can show an AI trading workflow with a real Mantle Sepolia audit
proof transaction. The same pipeline attaches to agent-submitted Mantle
transactions and verifies their receipts before anchoring the audit proof.

## Step-by-step flow

1. An AI agent emits telemetry to OpenStat during a run.
2. If the run includes a Mantle transaction, OpenStat stores the transaction
   hash and run context.
3. OpenStat reconciles the transaction through Mantle RPC and records the
   receipt status.
4. Audit Copilot analyzes redacted run context and produces a structured
   verdict.
5. OpenStat hashes the redacted telemetry and AI verdict.
6. OpenStat calls `OpenStatAuditAnchor.anchorAudit(...)` on Mantle Sepolia.
7. The dashboard displays the correlated run, AI audit result, receipt status,
   proof status, and explorer links.

## Add Mantle transaction telemetry

After your agent submits a Mantle transaction, send the transaction hash to
OpenStat with the same `runId` used for the agent run.

JavaScript:

```ts
await openstat.recordChainTransaction({
  agent: { id: "agent-1", name: "Mantle Agent" },
  runId: run.runId,
  chain: "mantle",
  chainId: 5003,
  txHash: "0x...",
  action: "buy_token",
  status: "submitted",
});
```

Python:

```python
client.record_chain_transaction(
    agent={"id": "agent-1", "name": "Mantle Agent"},
    run_id=run_id,
    chain="mantle",
    chain_id=5003,
    tx_hash="0x...",
    action="buy_token",
    status="submitted",
)
```

Use Mantle Sepolia chain id `5003` for testnet workflows. Use Mantle mainnet
chain id `5000` for approved production workflows.

OpenStat uses this event to reconcile the transaction receipt through Mantle RPC
and correlate receipt status with the run audit.

## When to use this

Use AI Agent Proofs on Mantle when you need a public proof that an AI-agent
audit was created without revealing the private details of the run. OpenStat
keeps the agent's operational data and AI reasoning off-chain, then commits only
hashed audit evidence to Mantle.

This gives teams a verifiable trail for autonomous-agent activity while keeping
sensitive telemetry, prompts, wallet secrets, and account data private.

## FAQ

### Does the smart contract verify whether a buy or sell really happened?

Not by itself. OpenStat verifies submitted transaction hashes through Mantle RPC
and stores the receipt status in the dashboard. The smart contract stores the
final redacted audit commitment.

### Does OpenStat publish raw telemetry on-chain?

No. OpenStat anchors hashes of redacted telemetry and AI audit output. Raw
prompts, private wallet data, secrets, and unredacted tool payloads are not
written on-chain.

### What does the audit proof transaction prove?

It proves that OpenStat anchored a specific redacted audit commitment through
the verified `OpenStatAuditAnchor` contract on Mantle Sepolia.

### Can this work with real agent-submitted trades?

Yes. The same pipeline can attach to real agent-submitted Mantle transactions,
reconcile their receipts, create an AI audit verdict, and anchor the final
audit commitment.

### Will this support other chains?

The first proof integration is Mantle-first. OpenStat's ingestion model stores
generic chain transaction telemetry, so additional chain proof and receipt
integrations can be added without changing the core agent event model.
