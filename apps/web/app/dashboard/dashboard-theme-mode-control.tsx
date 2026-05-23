"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

type DashboardThemeMode = "dark" | "light";

const storageKey = "openstat-dashboard-theme-mode";

function applyTheme(mode: DashboardThemeMode) {
  document
    .querySelectorAll<HTMLElement>(".dashboard-layout")
    .forEach((layout) => {
      layout.dataset.dashboardTheme = mode;
      layout.dataset.dashboardThemeMode = mode;
    });
}

export function DashboardThemeModeControl() {
  const [mode, setMode] = useState<DashboardThemeMode>("dark");
  const isDark = mode === "dark";
  const Icon = isDark ? Moon : Sun;
  const nextMode = isDark ? "light" : "dark";

  useLayoutEffect(() => {
    const savedMode = window.localStorage.getItem(storageKey);
    const initialMode = savedMode === "light" ? "light" : "dark";

    setMode(initialMode);
    applyTheme(initialMode);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, mode);
    applyTheme(mode);
  }, [mode]);

  return (
    <div className="dashboard-theme-control">
      <button
        aria-label={`Switch to ${nextMode} mode`}
        aria-pressed={isDark}
        className="dashboard-theme-button"
        title={`Switch to ${nextMode} mode`}
        type="button"
        onClick={() => setMode(nextMode)}
      >
        <Icon aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
