"use client";

import { toast } from "sonner";
import { PenLine, Map, Image as ImageIcon, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { HeroBanner } from "@/components/hero-banner";

const METHODS = [
  {
    icon: PenLine,
    color: "#2D6A4F",
    bg: "#E8F5EE",
    title: "Dibujar manualmente",
    badge: "Recomendado",
    description: "Trazá los límites de tus potreros directamente en el visor web, sin necesidad de archivos externos.",
    toastMessage: "Carga manual (próximamente)",
  },
  {
    icon: Map,
    color: "#3B7DC4",
    bg: "#E8F0FA",
    title: "KMZ / KML",
    badge: "GIS",
    description: "Importá polígonos y rutas exportadas desde Google Earth u otro GIS manteniendo la geometría original.",
    toastMessage: "Subir KMZ (próximamente)",
  },
  {
    icon: ImageIcon,
    color: "#D4930D",
    bg: "#FDF4E3",
    title: "Imagen de croquis",
    badge: "Referencia",
    description: "Subí una foto o escaneo del croquis del campo como capa de fondo para luego digitalizar los sectores.",
    toastMessage: "Subir imagen (próximamente)",
  },
];

/** Puerto directo de MapPage del legacy: `hasMap` es una constante `false`
 *  hardcodeada, no hay ninguna carga de datos ni persistencia -- los 3
 *  métodos solo disparan un toast "(próximamente)", ninguno abre un selector
 *  de archivo (a diferencia de las tarjetas similares de Cómo empezar, que sí
 *  abren un input real). El modelo `Pasture` no tiene ningún campo de
 *  geometría/mapa en el schema -- no hay nada que persistir todavía. */
export default function MapPage() {
  return (
    <div className="space-y-6">
      <HeroBanner
        title="Mapa del campo"
        subtitle="Subí o actualizá la cartografía del establecimiento para alinear potreros y referencias."
      />

      <div className="space-y-3">
        <h2 className="font-heading text-base font-semibold">Formas de carga</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <Card
                key={method.title}
                role="button"
                tabIndex={0}
                onClick={() => toast.info(method.toastMessage)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toast.info(method.toastMessage);
                }}
                className="relative cursor-pointer rounded-2xl shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <span className="absolute top-3 right-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {method.badge}
                </span>
                <CardContent className="flex flex-col items-start gap-2">
                  <span
                    className="flex size-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: method.bg, color: method.color }}
                  >
                    <Icon size={18} />
                  </span>
                  <p className="font-heading text-sm font-bold">{method.title}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MapPin size={26} />
        </span>
        <p className="font-medium text-foreground">Todavía no hay mapa cargado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Usá alguna de las opciones de arriba para cargar límites, polígonos o una imagen de referencia.
        </p>
      </div>
    </div>
  );
}
