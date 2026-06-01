import {
  getDashboardData,
  getDashboardOnchainTransactions,
  type DashboardChainFilter,
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
import {
  getChainFilterLabel,
  getChainFilterHref,
  OnchainChainFilter,
} from "./onchain-chain-filter";

export type OnchainDashboardProps = {
  chain: DashboardChainFilter;
  searchParams?: Promise<DashboardSearchParams>;
};

export async function OnchainDashboard(props: OnchainDashboardProps) {
  const searchParams = await props.searchParams;
  const range = parseDashboardRange(getFirstParam(searchParams?.range));
  const selectedChain = props.chain === "all" ? undefined : props.chain;
  const [data, onchain] = await Promise.all([
    getDashboardData(range),
    getDashboardOnchainTransactions({ chain: selectedChain }),
  ]);

  return (
    <DashboardRouteShell
      closeHref={buildOnchainHref({ chain: props.chain, range })}
      data={{ ...data, errors: [...data.errors, ...onchain.errors] }}
      range={range}
      title="Onchain transactions"
    >
      <DashboardPanel
        actions={
          <OnchainChainFilter
            chain={props.chain}
            getHref={(chain) => buildOnchainHref({ chain, range })}
            range={range}
          />
        }
        eyebrow="Blockchain verification"
        title="Observed transactions"
        titleCount={onchain.transactions.length}
      >
        <DashboardDataTable
          empty={getEmptyMessage(props.chain)}
          items={onchain.transactions}
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
              render: (transaction) => getNetworkLabel(transaction),
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
                    {transaction.insight.verdict} -{" "}
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

export function parseOnchainChain(value: string | undefined) {
  if (value === "mantle" || value === "base" || value === "bnb") {
    return value;
  }

  return undefined;
}

function getEmptyMessage(chain: DashboardChainFilter) {
  const label = getChainFilterLabel(chain);

  return chain === "all"
    ? "No onchain transactions observed yet."
    : `No ${label ?? "selected chain"} transactions observed yet.`;
}

function buildOnchainHref(options: {
  chain: DashboardChainFilter;
  range: string;
}) {
  const query = new URLSearchParams({ range: options.range });

  return `${getChainFilterHref(options.chain) ?? "/dashboard/onchain"}?${query.toString()}`;
}

function getNetworkLabel(transaction: { chain: string; chainId: number }) {
  const knownNetworks: Record<string, string> = {
    "base:8453": "Base",
    "base:84532": "Base Sepolia",
    "bnb:56": "BNB Chain",
    "bnb:97": "BNB Chain Testnet",
    "mantle:5000": "Mantle",
    "mantle:5003": "Mantle Sepolia",
  };

  return (
    knownNetworks[`${transaction.chain}:${transaction.chainId}`] ??
    `${formatChainLabel(transaction.chain)} ${transaction.chainId}`
  );
}

function formatHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function formatChainLabel(chain: string) {
  return chain
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
