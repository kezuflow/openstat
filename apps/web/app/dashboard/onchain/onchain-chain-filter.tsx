"use client";

import { useRouter } from "next/navigation";

import type { DashboardChainFilter } from "../../../lib/openstat-api";
import { onchainChainFilters } from "./onchain-chain-options";

type OnchainChainFilterProps = {
  chain: DashboardChainFilter;
  hrefByChain: Record<DashboardChainFilter, string>;
};

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
            props.hrefByChain[event.target.value as DashboardChainFilter],
            { scroll: false },
          );
        }}
        value={props.chain}
      >
        {onchainChainFilters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </div>
  );
}
