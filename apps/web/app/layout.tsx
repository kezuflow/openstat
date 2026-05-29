import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";

import {
  dashboardThemeCookieName,
  getDashboardThemeMode,
} from "../lib/dashboard-theme";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "OpenStat",
  description: "Decision-to-trade observability for AI trading agents",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedDashboardTheme = cookieStore.get(dashboardThemeCookieName)?.value;
  const hasSavedDashboardTheme =
    savedDashboardTheme === "dark" || savedDashboardTheme === "light";
  const theme = hasSavedDashboardTheme
    ? getDashboardThemeMode(savedDashboardTheme)
    : "light";

  return (
    <html
      className={`${plusJakartaSans.variable} ${theme}`}
      data-dashboard-theme={hasSavedDashboardTheme ? theme : undefined}
      data-theme={theme}
      lang="en"
      style={{ colorScheme: theme }}
    >
      <body
        data-dashboard-theme={hasSavedDashboardTheme ? theme : undefined}
        style={{ colorScheme: theme }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
