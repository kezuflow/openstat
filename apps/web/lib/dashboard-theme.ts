export type DashboardThemeMode = "dark" | "light";

export const dashboardThemeCookieName = "openstat-dashboard-theme-mode";

export function getDashboardThemeMode(
  value: string | null | undefined,
  fallback: DashboardThemeMode = "dark",
): DashboardThemeMode {
  if (value === "dark" || value === "light") {
    return value;
  }

  return fallback;
}
