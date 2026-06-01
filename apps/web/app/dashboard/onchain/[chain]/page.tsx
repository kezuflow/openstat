import { notFound } from "next/navigation";

import type { DashboardSearchParams } from "../../dashboard-page-utils";
import { OnchainDashboard, parseOnchainChain } from "../onchain-dashboard";

type OnchainChainPageProps = {
  params: Promise<{ chain: string }>;
  searchParams?: Promise<DashboardSearchParams>;
};

export default async function OnchainChainPage(props: OnchainChainPageProps) {
  const params = await props.params;
  const chain = parseOnchainChain(params.chain);

  if (!chain) {
    notFound();
  }

  return <OnchainDashboard chain={chain} searchParams={props.searchParams} />;
}
