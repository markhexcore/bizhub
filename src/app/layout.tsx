import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BizHub — Business Registration & Management Hub",
  description: "Register your business, manage photos, track transactions, and grow your presence on BizHub — the all-in-one business management platform.",
  keywords: "business registration, business management, transactions, photos, hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
