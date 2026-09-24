import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Provider from "../QueryClientProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ReachInbox",
  description: "Email scheduling dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-page antialiased">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
