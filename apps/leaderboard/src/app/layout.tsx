import type { Metadata } from "next";
import { Poppins, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import AutoRotate from "@/components/AutoRotate";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'League of Champions'

export const metadata: Metadata = {
  title: `${systemName} Leaderboard`,
  description: "The Operating System for Islamic School Culture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${sourceSans.variable} antialiased`}>
        <AutoRotate />
        {children}
      </body>
    </html>
  );
}
