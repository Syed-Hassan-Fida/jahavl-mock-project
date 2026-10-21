import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const source = Inter({
  variable: "--font-source",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlow = Instrument_Serif({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "JAH Audio | LED, lighting, and live sound",
    template: "%s | JAH Audio",
  },
  description:
    "Own-brand LED walls, stage lighting, and live sound for houses of worship, venues, and touring. Specify, quote, and order from one catalog.",
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${source.variable} ${barlow.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
