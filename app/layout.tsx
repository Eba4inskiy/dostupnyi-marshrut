import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./theme-provider";

export const metadata: Metadata = {
  title: "Доступний маршрут — Київ без зайвих перешкод",
  description: "Пішохідні маршрути Києвом з урахуванням мобільності, перешкод і повідомлень спільноти.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head><link rel="stylesheet" href="/vendor/leaflet.css"/><link rel="stylesheet" href="/fonts/fonts.css"/></head>
      <body className="antialiased"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
