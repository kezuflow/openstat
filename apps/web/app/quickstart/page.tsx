import Image from "next/image";
import Link from "next/link";

export default function QuickstartPage() {
  return (
    <main className="content-page">
      <nav className="content-nav" aria-label="Quickstart navigation">
        <Link className="content-brand" href="/">
          <Image
            aria-hidden="true"
            alt=""
            className="landing-brand-logo"
            height={32}
            src="/assets/logo.svg"
            width={32}
          />
          OpenStat
        </Link>
        <div className="content-nav-links">
          <Link href="/docs">Docs</Link>
          <Link href="/quickstart">Quickstart</Link>
          <Link href="/sdk">SDKs</Link>
        </div>
      </nav>

      <article className="content-article">
        <p className="content-kicker">Quickstart</p>
        <h1>Send your first OpenStat telemetry event.</h1>
        <p>
          Create an ingestion key, install the SDK for your runtime, record a
          heartbeat, and emit one decision-to-outcome run so OpenStat can build
          a timeline your team can inspect.
        </p>

        <section className="content-step">
          <span>01</span>
          <div>
            <h2>Create an ingestion key</h2>
            <p>
              Create a project API key and expose it to your agent runtime as
              <code>OPENSTAT_API_KEY</code>. The plaintext key is shown only
              once, so store it in your runtime secret manager.
            </p>
            <pre>
              <code>{`OPENSTAT_API_KEY=ostat_...
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_SERVICE_NAME=paper-trader
OPENSTAT_ENVIRONMENT=production`}</code>
            </pre>
          </div>
        </section>

        <section className="content-step">
          <span>02</span>
          <div>
            <h2>Install an SDK</h2>
            <p>
              OpenStat has TypeScript and Python helpers for native telemetry
              and OpenTelemetry HTTP exporter configuration.
            </p>
            <pre>
              <code>{`pnpm add openstat
pip install openstat-sdk`}</code>
            </pre>
          </div>
        </section>

        <section className="content-step">
          <span>03</span>
          <div>
            <h2>Record a complete first run</h2>
            <p>
              Use one run id for the heartbeat, lifecycle, decision, risk,
              execution, PnL, and completion events.
            </p>
            <pre>
              <code>{`import { createOpenStatClient } from "openstat";

const openstat = createOpenStatClient({
  apiKey: process.env.OPENSTAT_API_KEY!,
  endpoint: process.env.OPENSTAT_ENDPOINT ?? "https://api.openstat.online",
  serviceName: process.env.OPENSTAT_SERVICE_NAME ?? "paper-trader",
  environment: process.env.OPENSTAT_ENVIRONMENT ?? "production",
});

const agent = { id: "agent-1", name: "Paper Trader" };
const run = openstat.startAgentRun({ strategy: "breakout" });

await openstat.sendHeartbeat({
  agent,
  status: "online",
  expectedCheckInSeconds: 60,
});

await openstat.recordRunLifecycle({
  runId: run.runId,
  agent,
  status: "running",
  strategy: "breakout",
  symbols: ["BTC-USD"],
  summary: "Run started.",
});

await openstat.recordDecision({
  runId: run.runId,
  agent,
  strategy: "breakout",
  symbol: "BTC-USD",
  venue: "paper",
  action: "enter_long",
  confidence: 82,
  rationaleSummary: "Momentum and risk budget aligned.",
});

await openstat.recordRiskCheck({
  runId: run.runId,
  agent,
  result: "approved",
  reason: "Position is within the configured risk budget.",
});

await openstat.recordOrder({
  runId: run.runId,
  agent,
  strategy: "breakout",
  symbol: "BTC-USD",
  venue: "paper",
  side: "buy",
  orderType: "limit",
  quantity: "0.10",
  price: "62500",
  status: "filled",
});

await openstat.recordPnlSnapshot({
  runId: run.runId,
  agent,
  strategy: "breakout",
  symbol: "BTC-USD",
  realizedPnl: "18.42",
  equity: "10018.42",
});

await openstat.recordRunLifecycle({
  runId: run.runId,
  agent,
  status: "completed",
  strategy: "breakout",
  symbols: ["BTC-USD"],
  summary: "Run completed.",
});`}</code>
            </pre>
          </div>
        </section>

        <section className="content-step">
          <span>04</span>
          <div>
            <h2>Keep telemetry safe</h2>
            <p>
              Send summaries and stable identifiers. Do not send API keys,
              private keys, wallet secrets, raw prompts, raw tool payloads, or
              unredacted account and order identifiers.
            </p>
          </div>
        </section>
      </article>
    </main>
  );
}
