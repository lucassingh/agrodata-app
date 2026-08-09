import "./globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AgroData — Todo tu campo, ordenado por WhatsApp",
  description:
    "AgroData organiza todo lo que pasa en tu campo con IA por WhatsApp. Cargá siembra, animales, gastos y facturas desde el chat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
