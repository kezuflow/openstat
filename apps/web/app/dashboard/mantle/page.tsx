import {
  getDashboardData,
  getDashboardMantleTransactions,
} from "../../../lib/openstat-api";
import {
  DashboardDataTable,
  DashboardPanel,
  DashboardStatusChip,
  formatDateTime,
} from "../dashboard-components";
import {
  getFirstParam,
  parseDashboardRange,
  type DashboardSearchParams,
} from "../dashboard-page-utils";
import { DashboardRouteShell } from "../dashboard-route-shell";

type MantlePageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

export default async function MantlePage(props: MantlePageProps) {
  const searchParams = await props.searchParams;
  const range = parseDashboardRange(getFirstParam(searchParams?.range));
  const [data, mantle] = await Promise.all([
    getDashboardData(range),
    getDashboardMantleTransactions(),
  ]);

  return (
    <DashboardRouteShell
      closeHref={`/dashboard/mantle?range=${range}`}
      data={{ ...data, errors: [...data.errors, ...mantle.errors] }}
      range={range}
      title="Mantle verification"
    >
      <DashboardPanel
        eyebrow="Optional chain adapter"
        title="Observed transactions"
        titleCount={mantle.transactions.length}
      >
        <DashboardDataTable
          empty="No Mantle transactions observed yet."
          items={mantle.transactions}
          columns={[
            {
              key: "transaction",
              label: "Transaction",
              render: (transaction) =>
                transaction.explorerUrl ? (
                  <a
                    className="dashboard-table-primary"
                    href={transaction.explorerUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {formatHash(transaction.transactionHash)}
                  </a>
                ) : (
                  <span className="dashboard-table-primary">
                    {formatHash(transaction.transactionHash)}
                  </span>
                ),
            },
            {
              key: "status",
              label: "Receipt",
              render: (transaction) => (
                <DashboardStatusChip status={transaction.status} />
              ),
            },
            {
              key: "network",
              label: "Network",
              render: (transaction) =>
                transaction.chainId === 5000 ? "Mantle" : "Mantle Sepolia",
            },
            {
              key: "action",
              label: "Action",
              render: (transaction) => transaction.action ?? "Observed action",
            },
            {
              key: "run",
              label: "Run",
              render: (transaction) =>
                transaction.externalRunId ?? "Uncorrelated",
            },
            {
              key: "insight",
              label: "Audit Copilot",
              render: (transaction) =>
                transaction.insight ? (
                  <span title={transaction.insight.summary}>
                    {transaction.insight.verdict} ·{" "}
                    {transaction.insight.riskScore}/100
                  </span>
                ) : (
                  "Not analyzed"
                ),
            },
            {
              key: "proof",
              label: "Proof",
              render: (transaction) =>
                transaction.anchor ? (
                  <a
                    className="dashboard-table-primary"
                    href={transaction.anchor.explorerUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Anchored
                  </a>
                ) : (
                  "Awaiting anchor"
                ),
            },
            {
              key: "submitted",
              label: "Submitted",
              render: (transaction) => formatDateTime(transaction.submittedAt),
            },
          ]}
        />
      </DashboardPanel>
    </DashboardRouteShell>
  );
}

function formatHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
