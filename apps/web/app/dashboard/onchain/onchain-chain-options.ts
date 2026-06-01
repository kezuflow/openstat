import type { DashboardChainFilter } from "../../../lib/openstat-api";

export const onchainChainFilters = [
  { href: "/dashboard/onchain", label: "All chains", value: "all" },
  { href: "/dashboard/onchain/mantle", label: "Mantle", value: "mantle" },
  { href: "/dashboard/onchain/base", label: "Base", value: "base" },
  { href: "/dashboard/onchain/bnb", label: "BNB Chain", value: "bnb" },
] as const satisfies Array<{
  href: string;
  label: string;
  value: DashboardChainFilter;
}>;

export function getChainFilterLabel(chain: DashboardChainFilter) {
  return onchainChainFilters.find((filter) => filter.value === chain)?.label;
}

export function getChainFilterHref(chain: DashboardChainFilter) {
  return onchainChainFilters.find((filter) => filter.value === chain)?.href;
}
