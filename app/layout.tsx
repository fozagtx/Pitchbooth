// SPDX-License-Identifier: MIT
import type { Metadata, Viewport } from "next";
import { Caveat_Brush, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const chalk = Caveat_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-chalk-face",
});

export const metadata: Metadata = {
  title: "Pitchbooth",
  description: "Turn your deck into a board you learn, then pitch without it.",
};

export const viewport: Viewport = {
  themeColor: "#fafaf7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${chalk.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
