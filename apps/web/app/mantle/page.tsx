import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  DatabaseZap,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

const auditSteps = [
  {
    icon: BrainCircuit,
    title: "Agent intent",
    text: "Correlate a run, action, and redacted reasoning summary before execution.",
  },
  {
    icon: DatabaseZap,
    title: "Mantle receipt",
    text: "Reconcile the submitted hash against Mantle RPC and retain the explorer link.",
  },
  {
    icon: ShieldCheck,
    title: "Audit insight",
    text: "Generate an explainable verdict and commit only safe digests onchain.",
  },
] as const;

export default function MantleShowcasePage() {
  return (
    <main className="mantle-page">
      <nav className="mantle-nav" aria-label="Mantle showcase navigation">
        <Link className="mantle-brand" href="/">
          OpenStat
        </Link>
        <Link className="mantle-nav-link" href="/sign-up">
          Track an agent
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </nav>

      <section className="mantle-hero">
        <p className="mantle-eyebrow">OpenStat for Mantle</p>
        <h1>See what an AI agent thought, executed, and proved.</h1>
        <p className="mantle-lede">
          OpenStat remains an analytics product for autonomous agents. The
          optional Mantle module adds receipt verification and audit anchors
          without putting private telemetry onchain.
        </p>
        <div className="mantle-actions">
          <Link className="mantle-button mantle-button-primary" href="/sign-up">
            Start tracking
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <a
            className="mantle-button mantle-button-secondary"
            href="https://docs.mantle.xyz/network/for-developers/resources-and-tooling/network-information"
            rel="noreferrer"
            target="_blank"
          >
            Mantle network
            <ExternalLink aria-hidden="true" size={15} />
          </a>
        </div>
      </section>

      <section className="mantle-flow" aria-labelledby="mantle-flow-title">
        <div className="mantle-section-heading">
          <p className="mantle-eyebrow">Verification flow</p>
          <h2 id="mantle-flow-title">
            Analytics first. Onchain proof when useful.
          </h2>
        </div>
        <div className="mantle-step-grid">
          {auditSteps.map(({ icon: Icon, text, title }) => (
            <article className="mantle-step" key={title}>
              <Icon aria-hidden="true" size={20} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mantle-audit-card"
        aria-labelledby="mantle-audit-title"
      >
        <div>
          <p className="mantle-eyebrow">Demo audit</p>
          <h2 id="mantle-audit-title">Mantle Sepolia audit anchor</h2>
          <p>
            The contract stores a run reference, telemetry digest, insight
            digest, outcome, submitter, and timestamp. Raw prompts, credentials,
            and order payloads stay offchain.
          </p>
        </div>
        <div className="mantle-verdict">
          <CheckCircle2 aria-hidden="true" size={20} />
          <span>Contract ready for approved Sepolia deployment</span>
        </div>
      </section>
    </main>
  );
}
