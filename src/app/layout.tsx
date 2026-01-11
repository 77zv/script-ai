import type { Metadata } from "next";
import { Geist, Geist_Mono, GFS_Didot} from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gfsDidot = GFS_Didot({
  variable: "--font-gfs-didot",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Saved you time",
  description: "Stop spending hours doomscrolling",
  icons: {
    icon: "/scribble.ico",
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
        className={`${geistSans.variable} ${geistMono.variable} ${gfsDidot.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
