import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SYSTEM_NAME, SYSTEM_TAGLINE } from "@/lib/branding";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: SYSTEM_NAME,
  description: SYSTEM_TAGLINE,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
