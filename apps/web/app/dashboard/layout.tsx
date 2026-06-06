import type { ReactNode } from "react";
import { cookies } from "next/headers";

import {
  dashboardThemeCookieName,
  getDashboardThemeMode,
} from "../../lib/dashboard-theme";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardThemeProvider } from "./dashboard-theme-provider";

export default async function DashboardLayout(props: { children: ReactNode }) {
  const cookieStore = await cookies();
  const theme = getDashboardThemeMode(
    cookieStore.get(dashboardThemeCookieName)?.value,
  );

  return (
    <DashboardThemeProvider initialMode={theme}>
      <div
        className="dashboard-layout"
        data-dashboard-theme={theme}
        data-dashboard-theme-mode={theme}
      >
        <DashboardSidebar />
        {props.children}
      </div>
    </DashboardThemeProvider>
  );
}
