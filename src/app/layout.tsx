import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ali-Frame Job Management System",
  description: "Ali-Frame Windows & Doors — job management",
  // Name shown under the icon when added to a phone's Home Screen
  appleWebApp: { capable: true, title: "Ali-Frame", statusBarStyle: "black" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
