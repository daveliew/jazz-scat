import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jazz Scat - Your AI Jam Partner",
  description:
    "Practice vocals with AI-generated backing tracks and real-time coaching. No band needed.",
  keywords: ["music", "AI", "voice", "jamming", "companion", "scat", "jazz", "improv", "vocals"],
  openGraph: {
    title: "Jazz Scat - Your AI Jam Partner",
    description: "Practice vocals with AI-generated backing tracks and real-time coaching. No band needed.",
    type: "website",
    locale: "en_US",
    siteName: "Jazz Scat",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jazz Scat - Your AI Jam Partner",
    description: "Practice vocals with AI-generated backing tracks and real-time coaching.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
