import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/components.css";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Lumigift — Time-Locked Cash Gifts on Stellar",
    template: "%s | Lumigift",
  },
  description:
    "Send cash gifts that stay hidden until a surprise unlock date. Powered by Stellar blockchain and USDC.",
  keywords: ["gifting", "stellar", "usdc", "blockchain", "nigeria", "surprise gift"],
  openGraph: {
    title: "Lumigift — Time-Locked Cash Gifts",
    description: "Send cash gifts that unlock on a surprise date.",
    url: "https://www.lumigift.com",
    siteName: "Lumigift",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumigift — Time-Locked Cash Gifts",
    description: "Send cash gifts that unlock on a surprise date.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
