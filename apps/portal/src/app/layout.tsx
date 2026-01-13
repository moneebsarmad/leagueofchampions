import type { Metadata } from "next";
import { Montserrat, Amiri } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  title: "League of Champions",
  description: "League of Champions for Dar Al-Arqam Islamic School"};

export default function RootLayout({
  children}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${amiri.variable} ${montserrat.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
