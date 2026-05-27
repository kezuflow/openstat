import { getDashboardData } from "../../../lib/openstat-api";
import {
  getFirstParam,
  parseDashboardRange,
  type DashboardSearchParams,
} from "../dashboard-page-utils";
import { DashboardRouteShell } from "../dashboard-route-shell";
import { ApiKeysManager } from "./api-keys-manager";

type ApiKeysPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

export default async function ApiKeysPage(props: ApiKeysPageProps) {
  const searchParams = await props.searchParams;
  const range = parseDashboardRange(getFirstParam(searchParams?.range));
  const data = await getDashboardData(range);

  return (
    <DashboardRouteShell
      closeHref={`/dashboard/api-keys?range=${range}`}
      data={data}
      range={range}
      title="API keys"
    >
      <ApiKeysManager initialApiKeys={data.apiKeys} />
    </DashboardRouteShell>
  );
}
