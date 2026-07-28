import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paris, Nouvelle Vie — симулятор переезда",
  description: "Пиксельная 2D-история о переезде в Париж, адаптации и пути к гражданству Франции.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
