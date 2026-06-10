# Quick installation

OpenStat accepts telemetry from JavaScript, Python, direct HTTP ingestion, and
OpenTelemetry-compatible exporters. Most agent teams should start with one SDK,
send a heartbeat, then add run, decision, risk, execution, and outcome events as
the agent matures.

## 1. Create an ingestion key

Before installing an SDK:

1. Sign in at [https://openstat.online](https://openstat.online).
2. Open the workspace and project that should receive telemetry.
3. Go to **API Keys**.
4. Create an ingestion key.
5. Copy the plaintext key once and store it as `OPENSTAT_API_KEY`.

The dashboard shows the key only once. After that, OpenStat stores only the key
prefix and hash.

## 2. Set environment variables

Set these in your agent runtime:

```sh
OPENSTAT_API_KEY=ostat_...
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_SERVICE_NAME=my-agent
OPENSTAT_ENVIRONMENT=production
```

Use `OPENSTAT_ENDPOINT=http://localhost:4000` only when sending telemetry to a
local OpenStat backend during development.

## 3. Install the JavaScript SDK

Install the public npm package:

```sh
pnpm add openstat
```

or:

```sh
npm install openstat
```

Package page:
[https://www.npmjs.com/package/openstat](https://www.npmjs.com/package/openstat)

Send a first heartbeat:

```ts
import { createOpenStatClient } from "openstat";

const openstat = createOpenStatClient({
  apiKey: process.env.OPENSTAT_API_KEY!,
  endpoint: process.env.OPENSTAT_ENDPOINT ?? "https://api.openstat.online",
  serviceName: process.env.OPENSTAT_SERVICE_NAME ?? "my-agent",
  environment: process.env.OPENSTAT_ENVIRONMENT ?? "production",
});

await openstat.sendHeartbeat({
  agent: { id: "agent-1", name: "My Agent" },
  status: "online",
  expectedCheckInSeconds: 60,
  summary: "Agent is ready to accept work.",
});
```

## 4. Install the Python SDK

Install the public PyPI package:

```sh
pip install openstat-sdk
```

Package page:
[https://pypi.org/project/openstat-sdk/](https://pypi.org/project/openstat-sdk/)

The Python package is published as `openstat-sdk`, but the import path is
`openstat`:

```python
import os

from openstat import OpenStatClient

client = OpenStatClient(
    api_key=os.environ["OPENSTAT_API_KEY"],
    endpoint=os.environ.get("OPENSTAT_ENDPOINT", "https://api.openstat.online"),
    service_name=os.environ.get("OPENSTAT_SERVICE_NAME", "my-agent"),
    environment=os.environ.get("OPENSTAT_ENVIRONMENT", "production"),
)

client.send_heartbeat(
    agent={"id": "agent-1", "name": "My Agent"},
    status="online",
    expected_check_in_seconds=60,
    summary="Agent is ready to accept work.",
)
```

## 5. Keep secrets out of telemetry

Send API keys only in the `Authorization` header. Do not include private keys,
wallet secrets, raw prompts, raw tool payloads, account identifiers, or order
payloads in event data.

Use metadata for safe labels such as `strategy`, `environment`, `market`,
`chain`, `network`, and `execution_mode`.

## Direct HTTP

SDKs are optional. You can send events directly to the API:

```sh
curl -X POST "https://api.openstat.online/v1/ingest/heartbeat" \
  -H "Authorization: Bearer $OPENSTAT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent":{"name":"my-agent"},"data":{"status":"online"}}'
```

Never put the API key in the JSON body. Always send it as:

```text
Authorization: Bearer $OPENSTAT_API_KEY
```
