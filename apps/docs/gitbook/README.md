# OpenStat documentation

OpenStat is the analytics and verification layer for AI agents. It gives teams
a structured way to observe autonomous-agent runs, capture decisions and tool
calls, monitor trading workflows, and verify important activity with audit
proofs.

Use OpenStat when you need to answer questions like:

- What did the agent attempt?
- Which model, tool, strategy, or chain action was involved?
- Did the run complete, fail, or need review?
- Can we verify the related on-chain activity and audit result later?

## What OpenStat tracks

OpenStat accepts telemetry from JavaScript, Python, direct HTTP calls, and
OpenTelemetry exporters. Common events include:

- heartbeats and liveness checks
- agent run lifecycle markers
- model usage
- decisions and risk checks
- tool calls
- orders, fills, positions, and PnL snapshots
- chain transaction metadata
- redacted audit insights and proof anchors

## Start here

If you are integrating an agent, begin with
[Quick installation](getting-started/quick-installation.md). It shows the
JavaScript and Python packages, the required API key environment variable, and a
minimal first heartbeat.

If you are reviewing on-chain proof behavior, read
[AI Agent Proofs on Mantle](guides/ai-agent-proofs-on-mantle.md).

If you are reviewing the Sui Overflow demo, read
[DeepBook Predict Agent Desk](guides/deepbook-predict-agent-desk.md). It shows
the public route, dashboard route, replay runner, execution modes, and safety
boundaries.

If you are preparing the final demo, use the
[Sui Overflow Submission Package](guides/sui-overflow-submission-package.md)
for the project summary, demo script, shot list, and validation checklist.

If you are building directly against HTTP, use the
[API Reference](https://openstat.gitbook.io/openstat-docs/api-reference/).
