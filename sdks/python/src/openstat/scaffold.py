from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


OPENSTAT_ENV_EXAMPLE = """\
# Copy these values into your environment or your project's .env file.
OPENSTAT_API_KEY=ostat_...
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_SERVICE_NAME=python-agent
OPENSTAT_ENVIRONMENT=development
"""

OPENSTAT_INTEGRATION = '''\
"""OpenStat telemetry client configuration."""

from __future__ import annotations

import os

from openstat import OpenStatClient


def create_openstat_client(*, service_name: str = "python-agent") -> OpenStatClient:
    """Create an OpenStat client from environment variables."""
    api_key = os.getenv("OPENSTAT_API_KEY")
    if not api_key:
        raise RuntimeError("Set OPENSTAT_API_KEY before creating an OpenStat client.")

    return OpenStatClient(
        api_key=api_key,
        endpoint=os.getenv("OPENSTAT_ENDPOINT"),
        service_name=os.getenv("OPENSTAT_SERVICE_NAME", service_name),
        environment=os.getenv("OPENSTAT_ENVIRONMENT"),
    )
'''

OPENSTAT_README = """\
# OpenStat integration

`openstat init` added a minimal Python integration for OpenStat telemetry.

1. Copy the values from `.env.openstat.example` into your environment or your
   project's `.env` file.
2. Set `OPENSTAT_API_KEY` to an API key from your OpenStat dashboard.
3. Import `create_openstat_client` from `openstat_integration.py`.

```python
from openstat_integration import create_openstat_client

client = create_openstat_client(service_name="my-agent")
run = client.start_agent_run(strategy="breakout")

client.send_heartbeat(
    run_id=run["run_id"],
    summary="Agent is online.",
)
```
"""

SCAFFOLD_FILES = {
    ".env.openstat.example": OPENSTAT_ENV_EXAMPLE,
    "openstat_integration.py": OPENSTAT_INTEGRATION,
    "OPENSTAT.md": OPENSTAT_README,
}


@dataclass(frozen=True)
class ScaffoldResult:
    created: tuple[Path, ...]
    skipped: tuple[Path, ...]


def scaffold_project(path: str | Path = ".", *, force: bool = False) -> ScaffoldResult:
    """Write OpenStat starter files into a project directory."""
    project_path = Path(path).expanduser().resolve()
    project_path.mkdir(parents=True, exist_ok=True)

    created: list[Path] = []
    skipped: list[Path] = []

    for relative_path, contents in SCAFFOLD_FILES.items():
        destination = project_path / relative_path
        if destination.exists() and not force:
            skipped.append(destination)
            continue

        destination.write_text(contents, encoding="utf-8")
        created.append(destination)

    return ScaffoldResult(created=tuple(created), skipped=tuple(skipped))
