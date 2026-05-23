import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenStat",
  description: "Decision-to-trade observability for AI trading agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="light" data-theme="light" lang="en">
      <body>{children}</body>
    </html>
  );
}
