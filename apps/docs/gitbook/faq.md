# FAQ

## What is OpenStat?

OpenStat is an analytics and verification layer for AI agents. It records agent
telemetry, tracks run lifecycle, monitors decisions and tools, and helps teams
inspect what autonomous systems did.

## Do I need to use an SDK?

No. The JavaScript and Python SDKs make integration easier, but every SDK call
maps to the HTTP API. You can send telemetry directly with HTTP requests.

## Which package should I install?

Use `openstat` from npm for JavaScript and TypeScript projects. Use
`openstat-sdk` from PyPI for Python projects.

The Python package name is `openstat-sdk`, but the import path is `openstat`.

## Where do I get an API key?

Create an ingestion key from the OpenStat dashboard and store it in your agent
runtime as `OPENSTAT_API_KEY`.

Always send the key in the `Authorization` header:

```text
Authorization: Bearer $OPENSTAT_API_KEY
```

Do not put API keys in request bodies, frontend code, telemetry metadata, or
public logs.

## What kinds of agents can use OpenStat?

OpenStat works for long-running agents, scheduled agents, trading agents,
research agents, workflow agents, and agents that call tools or submit chain
transactions.

## Does OpenStat execute trades?

No. OpenStat observes and verifies activity. It records the agent's decisions,
tool calls, transaction metadata, and outcomes so teams can audit what happened.

## How does on-chain verification work?

OpenStat stores submitted chain transaction metadata and reconciles receipts
through chain RPC. The first proof integration is Mantle-first: OpenStat can
anchor redacted audit commitments through `OpenStatAuditAnchor` on Mantle
Sepolia. Additional chain integrations are planned.

## Does OpenStat publish private telemetry on-chain?

No. OpenStat anchors cryptographic commitments to redacted audit data. Raw
prompts, wallet secrets, private account details, and unredacted telemetry are
not written on-chain.

## Where is the API Reference?

The API Reference is available here:

[https://openstat.gitbook.io/openstat-docs/api-reference/](https://openstat.gitbook.io/openstat-docs/api-reference/)
