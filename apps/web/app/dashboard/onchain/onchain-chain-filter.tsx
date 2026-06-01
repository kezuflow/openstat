"use client";

import { useRouter } from "next/navigation";

import type { DashboardChainFilter } from "../../../lib/openstat-api";

type OnchainChainFilterProps = {
  chain: DashboardChainFilter;
  getHref: (chain: DashboardChainFilter) => string;
  range: string;
};

const chainFilters = [
  { href: "/dashboard/onchain", label: "All chains", value: "all" },
  { href: "/dashboard/onchain/mantle", label: "Mantle", value: "mantle" },
  { href: "/dashboard/onchain/base", label: "Base", value: "base" },
  { href: "/dashboard/onchain/bnb", label: "BNB Chain", value: "bnb" },
] as const satisfies Array<{
  href: string;
  label: string;
  value: DashboardChainFilter;
}>;

export function OnchainChainFilter(props: OnchainChainFilterProps) {
  const router = useRouter();

  return (
    <div className="onchain-filter">
      <label htmlFor="onchain-chain">Chain</label>
      <select
        aria-label="Filter onchain transactions by chain"
        id="onchain-chain"
        onChange={(event) => {
          router.push(
            props.getHref(event.target.value as DashboardChainFilter),
          );
        }}
        value={props.chain}
      >
        {chainFilters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function getChainFilterLabel(chain: DashboardChainFilter) {
  return chainFilters.find((filter) => filter.value === chain)?.label;
}

export function getChainFilterHref(chain: DashboardChainFilter) {
  return chainFilters.find((filter) => filter.value === chain)?.href;
}
