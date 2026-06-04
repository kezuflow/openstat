# Quick installation

OpenStat supports JavaScript, Python, direct HTTP ingestion, and
OpenTelemetry-compatible exporters. Most agents start with one of the SDKs.

## JavaScript SDK

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
  serviceName: "my-agent",
  environment: "production",
});

await openstat.sendHeartbeat({
  agent: { id: "agent-1", name: "My Agent" },
  status: "online",
});
```

## Python SDK

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
    service_name="my-agent",
    environment="production",
)

client.send_heartbeat(
    agent={"id": "agent-1", "name": "My Agent"},
    status="online",
)
```

## Create an ingestion key

Before running an SDK example:

1. Open the OpenStat dashboard.
2. Choose the workspace and project that should receive telemetry.
3. Open the API Keys page.
4. Create an ingestion key.
5. Copy the key once and store it in your agent runtime as
   `OPENSTAT_API_KEY`.

## Environment variables

Set these in your agent runtime:

```sh
OPENSTAT_API_KEY=ostat_...
OPENSTAT_ENDPOINT=https://api.openstat.online
```

Use `OPENSTAT_ENDPOINT=http://localhost:4000` only when sending telemetry to a
local OpenStat backend during development.

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
