import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Ali-Frame Job Management System",
  description: "Ali-Frame Windows & Doors — job management",
  // Name shown under the icon when added to a phone's Home Screen
  appleWebApp: { capable: true, title: "Ali-Frame", statusBarStyle: "black" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={montserrat.className}>
      <body>{children}</body>
    </html>
  );
}
