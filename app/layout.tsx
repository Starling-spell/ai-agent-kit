import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenLayer + Arc Agent Kit",
  description:
    "AI agent kit: GenLayer adjudicates, Arc settles in USDC. Deployable on Vercel.",
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
