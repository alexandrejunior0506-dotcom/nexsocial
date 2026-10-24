import type { Metadata } from "next";
import { Chakra_Petch, Geist, JetBrains_Mono } from "next/font/google";
import { Atmosphere } from "@/components/atmosphere";
import { SpotlightProvider } from "@/components/spotlight-provider";
import { UiProvider } from "@/components/ui-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Títulos e marca (squared/techno, mesma família visual do BOTNITA).
const display = Chakra_Petch({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Números, horários e dados.
const data = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexSocial",
  description: "Agendador de Reels e analytics do Instagram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${display.variable} ${data.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Atmosphere />
        <SpotlightProvider />
        <UiProvider>{children}</UiProvider>
      </body>
    </html>
  );
}
