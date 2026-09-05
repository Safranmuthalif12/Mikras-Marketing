import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MIKRAS Marketing | Ideas that move",
  description: "MIKRAS blends bold creative, sharp strategy and performance media to grow ambitious brands.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
