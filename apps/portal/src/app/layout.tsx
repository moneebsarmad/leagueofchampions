import type { Metadata } from "next";
import { Poppins, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import SupabaseEnvBanner from "../components/SupabaseEnvBanner";

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

// Metadata uses env vars since it's generated at build time
const systemName = process.env.NEXT_PUBLIC_SYSTEM_NAME || 'League of Champions'
const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME || 'Dār al-Arqam Islamic School'

export const metadata: Metadata = {
  title: systemName,
  description: `${systemName} web experience for ${schoolName}`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${sourceSans.variable} antialiased`}>
        <AuthProvider>
          {children}
          <SupabaseEnvBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
