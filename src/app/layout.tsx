import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ali-Frame Job Management System",
  description: "Ali-Frame Windows & Doors — job management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
