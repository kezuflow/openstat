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

type OnchainPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

const chainFilters = [
  { label: "All chains", value: "all" },
  { label: "Mantle", value: "mantle" },
  { label: "Base", value: "base" },
  { label: "BNB Chain", value: "bnb" },
] as const satisfies Array<{ label: string; value: DashboardChainFilter }>;

export default async function OnchainTransactionsPage(props: OnchainPageProps) {
  const searchParams = await props.searchParams;
  const range = parseDashboardRange(getFirstParam(searchParams?.range));
  const chain = parseChainFilter(getFirstParam(searchParams?.chain));
  const selectedChain = chain === "all" ? undefined : chain;
  const [data, onchain] = await Promise.all([
    getDashboardData(range),
    getDashboardOnchainTransactions({ chain: selectedChain }),
  ]);

  return (
    <DashboardRouteShell
      closeHref={buildOnchainHref({ chain, range })}
      data={{ ...data, errors: [...data.errors, ...onchain.errors] }}
      range={range}
      rangeQueryParams={{ chain: chain === "all" ? undefined : chain }}
      title="Onchain transactions"
    >
      <DashboardPanel
        actions={<OnchainChainFilter chain={chain} range={range} />}
        eyebrow="Blockchain verification"
        title="Observed transactions"
        titleCount={onchain.transactions.length}
      >
        <DashboardDataTable
          empty={getEmptyMessage(chain)}
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

function OnchainChainFilter(props: {
  chain: DashboardChainFilter;
  range: string;
}) {
  return (
    <form action="/dashboard/onchain" className="onchain-filter" method="get">
      <input name="range" type="hidden" value={props.range} />
      <label htmlFor="onchain-chain">Chain</label>
      <select
        aria-label="Filter onchain transactions by chain"
        defaultValue={props.chain}
        id="onchain-chain"
        name="chain"
      >
        {chainFilters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
      <button type="submit">Apply</button>
    </form>
  );
}

function parseChainFilter(value: string | undefined): DashboardChainFilter {
  if (value === "mantle" || value === "base" || value === "bnb") {
    return value;
  }

  return "all";
}

function buildOnchainHref(options: {
  chain: DashboardChainFilter;
  range: string;
}) {
  const query = new URLSearchParams({ range: options.range });

  if (options.chain !== "all") {
    query.set("chain", options.chain);
  }

  return `/dashboard/onchain?${query.toString()}`;
}

function getEmptyMessage(chain: DashboardChainFilter) {
  const label = chainFilters.find((filter) => filter.value === chain)?.label;

  return chain === "all"
    ? "No onchain transactions observed yet."
    : `No ${label ?? "selected chain"} transactions observed yet.`;
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
