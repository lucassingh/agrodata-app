import { FileSpreadsheet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Descarga del módulo en Excel. Es un link común: el navegador baja el archivo. */
export function ExportButton({ href, className }: { href: string; className?: string }) {
  return (
    <a href={href} download className={cn(buttonVariants({ variant: "outline" }), className)}>
      <FileSpreadsheet size={14} aria-hidden />
      Exportar a Excel
    </a>
  );
}
