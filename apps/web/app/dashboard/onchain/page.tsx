import type { DashboardSearchParams } from "../dashboard-page-utils";
import { OnchainDashboard } from "./onchain-dashboard";

type OnchainPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

export default function OnchainTransactionsPage(props: OnchainPageProps) {
  return <OnchainDashboard chain="mantle" searchParams={props.searchParams} />;
}
