import type { Metadata, Viewport } from "next";
import { Open_Sans, Work_Sans } from "next/font/google";
import "./globals.css"; // richtig: liegt in /app/globals.css

const fontSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const fontHeading = Work_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GPX PWA",
  description: "GPX Parser PWA",
};

// Warnungen beheben: getrenntes viewport-Export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${fontSans.variable} ${fontHeading.variable}`}>
      <body>{children}</body>
    </html>
  );
}
