import { redirect } from "next/navigation";

import {
  getFirstParam,
  parseDashboardRange,
  type DashboardSearchParams,
} from "../dashboard-page-utils";

type MantleRedirectPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

export default async function MantleRedirectPage(
  props: MantleRedirectPageProps,
) {
  const searchParams = await props.searchParams;
  const range = parseDashboardRange(getFirstParam(searchParams?.range));

  redirect(`/dashboard/onchain/mantle?range=${range}`);
}
