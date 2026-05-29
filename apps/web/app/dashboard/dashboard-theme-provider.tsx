"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  dashboardThemeCookieName,
  type DashboardThemeMode,
} from "../../lib/dashboard-theme";

type DashboardThemeContextValue = {
  mode: DashboardThemeMode;
  setMode: (mode: DashboardThemeMode) => void;
};

const DashboardThemeContext = createContext<
  DashboardThemeContextValue | undefined
>(undefined);

export function DashboardThemeProvider(props: {
  children: ReactNode;
  initialMode: DashboardThemeMode;
}) {
  const [mode, setMode] = useState<DashboardThemeMode>(props.initialMode);

  useLayoutEffect(() => {
    applyDashboardTheme(mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
    }),
    [mode],
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      {props.children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const value = useContext(DashboardThemeContext);

  if (!value) {
    throw new Error(
      "useDashboardTheme must be used inside DashboardThemeProvider.",
    );
  }

  return value;
}

function applyDashboardTheme(mode: DashboardThemeMode) {
  document.cookie = `${dashboardThemeCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie =
    `${dashboardThemeCookieName}=${mode}; ` +
    "Path=/dashboard; Max-Age=31536000; SameSite=Lax";
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.dashboardTheme = mode;
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(mode);
  document.documentElement.style.colorScheme = mode;
  document.body.dataset.dashboardTheme = mode;
  document.body.style.colorScheme = mode;

  document
    .querySelectorAll<HTMLElement>(".dashboard-layout")
    .forEach((layout) => {
      layout.dataset.dashboardTheme = mode;
      layout.dataset.dashboardThemeMode = mode;
    });
}
