# OpenStat Python SDK

[![PyPI](https://img.shields.io/pypi/v/openstat-sdk)](https://pypi.org/project/openstat-sdk/)
[![Python](https://img.shields.io/pypi/pyversions/openstat-sdk)](https://pypi.org/project/openstat-sdk/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Native telemetry for AI agents, trading bots, and on-chain workflows.

OpenStat gives your app a structured timeline for agent runs: heartbeats,
model completions, decisions, risk checks, paper orders, fills, positions,
PnL snapshots, tool calls, errors, and chain transaction metadata.

## Features

- **Agent-native events** - send OpenStat lifecycle, decision, risk, trading,
  model, tool, error, and chain transaction events with one Python client.
- **Trading timeline helpers** - record orders, fills, positions, and PnL
  snapshots using OpenStat-compatible event fields.
- **Run correlation** - preserve `run_id`, strategy, symbol, venue, agent
  identity, trace IDs, span IDs, tags, and metadata across the whole run.
- **Vendor-neutral model telemetry** - track provider, model, status, latency,
  token counts, and stage metadata without coupling your app to one LLM vendor.
- **OpenTelemetry-ready config** - generate OTLP/HTTP URLs and auth headers for
  traces, logs, and metrics exporters.
- **Project scaffolding** - run `openstat init` to add starter files to an
  existing Python app.
- **Zero runtime dependencies** - the core SDK uses only the Python standard
  library.

## Installation

Minimal SDK:

```bash
pip install openstat-sdk
```

For local development and tests:

```bash
pip install -e ".[test]"
```

## Quick Start

```python
from openstat import OpenStatClient

client = OpenStatClient(
    api_key="ostat_...",
    service_name="paper-trader",
    environment="production",
)

run = client.start_agent_run(strategy="breakout")
run_id = run["run_id"]
agent = {"id": "agent-1", "name": "Paper Trader"}

client.record_run_lifecycle(
    run_id=run_id,
    agent=agent,
    status="running",
    strategy="breakout",
    symbols=["BTC-USD"],
    summary="Run started.",
)

client.record_decision(
    run_id=run_id,
    agent=agent,
    strategy="breakout",
    symbol="BTC-USD",
    venue="paper",
    action="enter_long",
    confidence=82,
    rationale_summary="Momentum and risk budget aligned.",
)

client.record_run_lifecycle(
    run_id=run_id,
    agent=agent,
    status="completed",
    strategy="breakout",
    symbols=["BTC-USD"],
    summary="Run completed.",
)
```

`endpoint` defaults to `https://api.openstat.online`. Set
`OPENSTAT_ENDPOINT=http://localhost:4000` only when sending telemetry to a local
OpenStat API during development.

## Trading Agent Example

Use the trading helpers when you want OpenStat to render the full paper-trading
timeline for one agent run.

```python
decision_id = "decision-lp-1"

client.record_decision(
    run_id=run_id,
    agent=agent,
    decision_id=decision_id,
    strategy="paper-lp-v1",
    symbol="ETH-USDC",
    venue="paper",
    action="open",
    confidence=76,
)

client.record_risk_check(
    run_id=run_id,
    agent=agent,
    decision_id=decision_id,
    result="approved",
    reason="Within exposure and volatility limits.",
    metadata={
        "strategy": "paper-lp-v1",
        "symbol": "ETH-USDC",
        "risk_score": 32,
    },
)

client.record_order(
    run_id=run_id,
    agent=agent,
    strategy="paper-lp-v1",
    symbol="ETH-USDC",
    venue="paper",
    side="buy",
    order_type="market",
    quantity="1000",
    price="1",
    decision_id=decision_id,
    metadata={
        "paper_notional_usd": 1000,
        "estimation_method": "shadow_yield_only_v1",
    },
)

client.record_fill(
    run_id=run_id,
    agent=agent,
    strategy="paper-lp-v1",
    symbol="ETH-USDC",
    venue="paper",
    side="buy",
    quantity="1000",
    price="1",
    fee="1.00",
)

client.record_position(
    run_id=run_id,
    agent=agent,
    strategy="paper-lp-v1",
    symbol="ETH-USDC",
    venue="paper",
    quantity="1000",
    average_price="1",
    metadata={"market_value": "1000"},
)

client.record_pnl_snapshot(
    run_id=run_id,
    agent=agent,
    strategy="paper-lp-v1",
    symbol="ETH-USDC",
    realized_pnl="0",
    unrealized_pnl="3.42",
    equity="10003.42",
    metadata={"estimated": True, "venue": "paper"},
)
```

For domain-specific systems such as LP research, keep OpenStat's accepted
trading fields (`side`, `quantity`, `price`, `fee`, `order_type`) in the event
data and put pool addresses, range state, paper notional, or estimation methods
inside `metadata`.

## CLI

Add editable OpenStat starter files to an existing Python project:

```bash
openstat init
```

Choose a target path:

```bash
openstat init --path ./my-agent
```

Overwrite existing starter files:

```bash
openstat init --force
```

The command creates:

| File | Purpose |
|---|---|
| `.env.openstat.example` | Environment variable template |
| `openstat_integration.py` | Small client factory for your app |
| `OPENSTAT.md` | Local integration notes |

## Configuration

The SDK constructor accepts explicit values, but most apps keep secrets and
deployment-specific settings in environment variables.

| Variable | Description |
|---|---|
| `OPENSTAT_API_KEY` | API key from the OpenStat dashboard |
| `OPENSTAT_ENDPOINT` | API endpoint, defaults to hosted OpenStat |
| `OPENSTAT_SERVICE_NAME` | App or service family name |
| `OPENSTAT_ENVIRONMENT` | Deployment environment, such as `dev` or `prod` |

## OpenTelemetry

Generate OTLP/HTTP targets and headers for OpenTelemetry exporters:

```python
from openstat import create_opentelemetry_http_config

otlp = create_opentelemetry_http_config(
    api_key="ostat_...",
    service_name="paper-trader",
)

print(otlp["traces"]["url"])
print(otlp["traces"]["headers"])
```

## Examples

The repository includes a runnable trading-agent example:

```bash
python examples/trading_agent.py
```

## Development

```bash
python -m pip install -e ".[test]"
python -m pytest
```

Build a local distribution:

```bash
python -m pip install build
python -m build
```

## Links

- Homepage: https://openstat.online
- Documentation: https://docs.openstat.online
- Source: https://github.com/kezuflow/openstat

## License

MIT
