import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketFlow",
  description: "AI-powered ticket interceptor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
