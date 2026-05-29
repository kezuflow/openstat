"use client";

import { Moon, Sun } from "lucide-react";

import { useDashboardTheme } from "./dashboard-theme-provider";

export function DashboardThemeModeControl() {
  const { mode, setMode } = useDashboardTheme();
  const isDark = mode === "dark";
  const Icon = isDark ? Moon : Sun;
  const nextMode = isDark ? "light" : "dark";

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
