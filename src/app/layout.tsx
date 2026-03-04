import type { Metadata } from "next";
import { Montserrat, Geist_Mono, DM_Serif_Text } from "next/font/google";
import "./globals.css";
import ProcessNav from "@/components/ProcessNav";
import { StoreInitializer } from "@/lib/store";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Text({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Deductive Design",
  description:
    "From chains of assertion to continuous exploration -- a design framework for the AI era",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${montserrat.variable} ${geistMono.variable} ${dmSerif.variable} antialiased bg-slate-900 text-slate-200`}
      >
        {/* Ambient background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="bg-circle-blue" style={{ top: '10%', left: '5%' }} />
          <div className="bg-circle-purple" style={{ bottom: '15%', right: '10%' }} />
        </div>

        <StoreInitializer>
          <ProcessNav />
          <main className="relative z-10 min-h-screen px-8 pt-20 pb-8">{children}</main>
        </StoreInitializer>
      </body>
    </html>
  );
}
