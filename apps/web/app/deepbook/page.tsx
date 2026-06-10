import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Chip, Link as HeroLink } from "@heroui/react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  RadioTower,
  ShieldCheck,
  Target,
} from "lucide-react";

import styles from "./deepbook-page.module.css";

export const metadata: Metadata = {
  title: "DeepBook Predict Agent Desk | OpenStat",
  description:
    "A DeepBook Predict operations desk for AI trading agents: strategy evaluation, risk gates, execution telemetry, settlement, PnL, and audit breadcrumbs.",
};

const timeline = [
  {
    label: "Market snapshot",
    meta: "SUI/USDC depth, spread, oracle drift",
    status: "captured",
  },
  {
    label: "Strategy evaluation",
    meta: "range mean reversion selected",
    status: "84%",
  },
  {
    label: "Risk gate",
    meta: "liquidity, exposure, settlement window",
    status: "approved",
  },
  {
    label: "Settlement",
    meta: "simulated outcome and PnL recorded",
    status: "settled",
  },
] as const;

const metrics = [
  { label: "Execution mode", value: "paper" },
  { label: "Market", value: "SUI/USDC" },
  { label: "Risk state", value: "approved" },
  { label: "Audit", value: "ready" },
] as const;

export default function DeepBookPage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="DeepBook navigation">
        <HeroLink className={styles.brand} href="/">
          <Image
            aria-hidden="true"
            alt=""
            height={32}
            priority
            src="/assets/logo.svg"
            width={32}
          />
          OpenStat
        </HeroLink>
        <div className={styles.navActions}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="https://docs.openstat.online">Docs</Link>
          <Link className={styles.navCta} href="/sign-up">
            Try it
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </nav>

      <section className={styles.hero} aria-labelledby="deepbook-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>DeepBook Predict for Sui Overflow</p>
          <h1 id="deepbook-title">DeepBook Predict Agent Desk</h1>
          <p>
            OpenStat turns a prediction-market agent run into an inspectable
            story: market context, strategy choice, risk approval, execution,
            settlement, PnL, and audit evidence in one operational surface.
          </p>
          <div className={styles.actions}>
            <Link
              className={`${styles.button} ${styles.buttonPrimary}`}
              href="/sign-up"
            >
              Open the desk
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link
              className={`${styles.button} ${styles.buttonSecondary}`}
              href="/dashboard/runs"
            >
              View runs
            </Link>
          </div>
        </div>

        <div className={styles.desk} aria-label="DeepBook Predict demo desk">
          <div className={styles.deskHeader}>
            <span>
              <RadioTower aria-hidden="true" size={16} />
              Live demo replay
            </span>
            <strong>SUI/USDC range agent</strong>
          </div>

          <div className={styles.metrics}>
            {metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <ol className={styles.timeline}>
            {timeline.map((item) => (
              <li key={item.label}>
                <span className={styles.timelineIcon}>
                  <CheckCircle2 aria-hidden="true" size={15} />
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.meta}</small>
                </div>
                <Chip color="success" size="sm" variant="soft">
                  <Chip.Label>{item.status}</Chip.Label>
                </Chip>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.system} aria-label="Agent desk capabilities">
        <article>
          <Target aria-hidden="true" size={20} />
          <h2>Strategy selection first</h2>
          <p>
            The agent compares candidate strategies before any simulated or
            testnet execution path can proceed.
          </p>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" size={20} />
          <h2>Risk gate before execution</h2>
          <p>
            Liquidity, exposure, slippage, and settlement checks are recorded as
            first-class telemetry.
          </p>
        </article>
        <article>
          <Activity aria-hidden="true" size={20} />
          <h2>Outcome and audit trail</h2>
          <p>
            Settlement, PnL, chain references, and audit packets stay connected
            to the original run.
          </p>
        </article>
        <article>
          <BookOpen aria-hidden="true" size={20} />
          <h2>Built on OpenStat</h2>
          <p>
            The same telemetry model works for generic trading agents and the
            DeepBook Predict demo path.
          </p>
        </article>
      </section>
    </main>
  );
}
