import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AutoRotate from "@/components/AutoRotate";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "League of Champions Leaderboard",
  description: "Where Champions Are Made",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${inter.className} antialiased`}>
        <AutoRotate />
        {children}
      </body>
    </html>
  );
}
