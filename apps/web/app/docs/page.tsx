import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2, FileText } from "lucide-react";

export default function DocsPage() {
  return (
    <main className="content-page">
      <nav className="content-nav" aria-label="Docs navigation">
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

      <section className="content-hero" aria-labelledby="docs-title">
        <p className="content-kicker">Documentation</p>
        <h1 id="docs-title">
          Build agent telemetry into your trading workflow.
        </h1>
        <p>
          OpenStat documentation collects the paths builders need after the
          landing page: installation, SDK usage, ingestion concepts, and the
          decision-to-trade telemetry model.
        </p>
      </section>

      <section className="content-grid" aria-label="Documentation sections">
        <article className="content-card">
          <span>Start</span>
          <h2>Quickstart</h2>
          <p>
            Create an ingestion key, install an SDK, and send the first decision
            event from a local agent.
          </p>
          <Link className="content-card-link" href="/quickstart">
            Open quickstart
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </article>
        <article className="content-card">
          <span>SDKs</span>
          <h2>TypeScript and Python</h2>
          <p>
            Use OpenStat helpers for agent runs, decisions, risk checks, orders,
            fills, PnL, heartbeats, and OTLP endpoint config.
          </p>
          <Link className="content-card-link" href="/sdk">
            View SDKs
            <Code2 aria-hidden="true" size={16} />
          </Link>
        </article>
        <article className="content-card">
          <span>Reference</span>
          <h2>API and telemetry model</h2>
          <p>
            Native ingestion and OTLP/HTTP shape the product around auditable
            trading-agent timelines.
          </p>
          <Link className="content-card-link" href="/quickstart">
            Read guide
            <BookOpen aria-hidden="true" size={16} />
          </Link>
        </article>
        <article className="content-card">
          <span>Concepts</span>
          <h2>Decision-to-trade flow</h2>
          <p>
            Trace market context, model reasoning, risk controls, execution,
            fills, PnL, and alerts in one run.
          </p>
          <span className="content-card-link">
            Coming next
            <FileText aria-hidden="true" size={16} />
          </span>
        </article>
      </section>
    </main>
  );
}
