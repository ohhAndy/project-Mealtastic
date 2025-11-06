import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import NavBar from "@/components/layout/NavBar";
import AuthProvider from "@/components/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair', 
});

export const metadata: Metadata = {
  title: "Mealtastic",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-slate-100`}
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
