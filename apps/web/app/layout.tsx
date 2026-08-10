import "./globals.css";
import type { Metadata } from "next";
import { Poppins, Work_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});

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
      className={cn("font-sans", poppins.variable, workSans.variable)}
    >
      <body className="antialiased">
        <TooltipProvider delay={200}>
          {children}
          <Toaster position="bottom-center" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
