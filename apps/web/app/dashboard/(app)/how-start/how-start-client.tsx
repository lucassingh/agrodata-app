"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Map,
  Upload,
  UserPlus,
  Check,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  MapPin,
  Download,
  Loader2,
  MessageCircle,
  Monitor,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeroBanner } from "@/components/hero-banner";
import { cn } from "@/lib/utils";
import { createPasturesBulkAction } from "../pastures/actions";
import { parseSpreadsheetFile } from "./parse-spreadsheet";
import { parseKmzKmlFile } from "./parse-kml";

const NO_TENANT_MESSAGE =
  "Primero creá un establecimiento: menú de tu perfil (arriba a la derecha) → Agregar campo. Después podés importar potreros.";

const STEPS = [
  {
    label: "Cargar potreros",
    subtitle: "Definí la estructura de tu campo",
    description: "Elegí la forma que mejor se adapte a tu operación. Podés combinar métodos para dejar todo listo.",
    icon: Map,
  },
  {
    label: "Subir datos",
    subtitle: "Empezá a registrar la actividad",
    description: "Los registros pueden ingresar por canales distintos; todos quedan centralizados en la plataforma.",
    icon: Upload,
  },
  {
    label: "Invitar al equipo",
    subtitle: "Sumá a tu gente al campo",
    description: "Definí quién administra y quién solo registra desde el celular. Cada rol tiene permisos específicos.",
    icon: UserPlus,
  },
];

interface HowStartClientProps {
  userName: string;
  hasActiveTenant: boolean;
  hasPastures: boolean;
}

export function HowStartClient({ userName, hasActiveTenant, hasPastures }: HowStartClientProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [uploading, setUploading] = useState<"xlsx" | "kmz" | null>(null);
  const [importResult, setImportResult] = useState<{ count: number; type: string } | null>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const kmzInputRef = useRef<HTMLInputElement>(null);

  const goToStep = (index: number) => {
    if (uploading) return;
    if (index > 0 && !hasPastures) return;
    setActiveStep(index);
  };

  const handleXlsxUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!hasActiveTenant) {
      toast.error(NO_TENANT_MESSAGE);
      return;
    }
    setUploading("xlsx");
    try {
      const rows = await parseSpreadsheetFile(file);
      if (rows.length === 0) {
        toast.error(
          'No se encontraron potreros válidos en el archivo. Verificá que tenga columnas "nombre" y opcionalmente "hectáreas".',
        );
        return;
      }
      const result = await createPasturesBulkAction(rows);
      if (!result.success) {
        toast.error(result.error || "No se pudo importar los potreros.");
        return;
      }
      toast.success(`Se importaron ${result.data.count} potrero(s) correctamente.`);
      setImportResult({ count: result.data.count, type: "Excel/CSV" });
    } catch {
      toast.error("Error al procesar el archivo. Verificá el formato.");
    } finally {
      setUploading(null);
    }
  };

  const handleKmzUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!hasActiveTenant) {
      toast.error(NO_TENANT_MESSAGE);
      return;
    }
    setUploading("kmz");
    try {
      const rows = await parseKmzKmlFile(file);
      if (rows.length === 0) {
        toast.error("No se encontraron placemarks con nombre en el archivo KML/KMZ.");
        return;
      }
      const result = await createPasturesBulkAction(rows);
      if (!result.success) {
        toast.error(result.error || "No se pudo importar desde KMZ/KML.");
        return;
      }
      toast.success(`Se importaron ${result.data.count} potrero(s) desde KMZ/KML.`);
      setImportResult({ count: result.data.count, type: "KMZ/KML" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el archivo. Verificá el formato.");
    } finally {
      setUploading(null);
    }
  };

  const current = STEPS[activeStep]!;

  return (
    <div className="space-y-6">
      <HeroBanner title={`¡Bienvenido, ${userName}!`} subtitle="Configurá tu campo en 3 pasos simples. Cada paso te acerca a tener toda tu operación digitalizada y bajo control." />

      <div className="flex items-center">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={uploading !== null || (i > 0 && !hasPastures)}
              onClick={() => goToStep(i)}
              className="flex flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  i <= activeStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {i < activeStep ? <Check size={16} /> : <step.icon size={15} />}
              </span>
              <span className="max-w-[110px] text-center text-xs font-medium text-foreground">{step.label}</span>
            </button>
            {i < STEPS.length - 1 ? (
              <div className="mx-2 h-0.5 flex-1 rounded bg-gradient-to-r from-primary/50 to-border" />
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {activeStep + 1}
          </span>
          <h2 className="font-heading text-lg font-semibold">{current.subtitle}</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{current.description}</p>

        {activeStep === 0 ? (
          <div className="space-y-4">
            {!hasActiveTenant ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                Para importar potreros primero tenés que <strong>crear un establecimiento</strong>: menú de tu
                perfil (arriba a la derecha) → <strong>Agregar campo</strong>. Después el import Excel o KMZ usará
                ese campo activo.
              </div>
            ) : null}

            {uploading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                {uploading === "xlsx" ? "Procesando archivo Excel…" : "Procesando archivo KMZ/KML…"}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MethodCard
                icon={Upload}
                title="Manual"
                description="Creá y editá potreros uno a uno desde la web con nombre, superficie y uso actual."
                onClick={() => router.push("/dashboard/pastures?create=1")}
              />
              <MethodCard
                icon={FileSpreadsheet}
                title="CSV o Excel"
                badge="Mejor opción"
                description="Descargá la plantilla de ejemplo, editala con tus lotes y subí el archivo para importarlos."
                onClick={() => xlsxInputRef.current?.click()}
                footer={
                  <a
                    href="/plantilla_lotes.xlsx"
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Download size={12} />
                    Descargar plantilla de ejemplo
                  </a>
                }
              />
              <MethodCard
                icon={MapPin}
                title="KMZ / KML"
                description="Subí archivos KMZ/KML para importar potreros desde Google Earth u otros GIS."
                onClick={() => kmzInputRef.current?.click()}
              />
            </div>

            <input ref={xlsxInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleXlsxUpload} />
            <input ref={kmzInputRef} type="file" accept=".kmz,.kml" className="hidden" onChange={handleKmzUpload} />

            {importResult ? (
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                Se importaron <strong>{importResult.count}</strong> potrero(s) desde {importResult.type}. Podés
                verlos en la sección{" "}
                <Link href="/dashboard/pastures" className="font-medium underline">
                  Potreros
                </Link>
                .
              </div>
            ) : null}
          </div>
        ) : null}

        {activeStep === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard
              icon={MessageCircle}
              title="WhatsApp"
              description="El equipo reporta lluvias, movimientos o sanidad por mensaje; el sistema los interpreta automáticamente con IA."
            />
            <InfoCard
              icon={Monitor}
              title="Plataforma web"
              description="Cargá y revisá datos desde el panel con tablas, formularios y validaciones en tiempo real."
            />
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <MethodCard
              icon={Shield}
              title="Administradores"
              description="Acceso completo: web y WhatsApp, configuración del campo, gestión de usuarios y reportes avanzados."
              onClick={() => router.push("/dashboard/team")}
            />
            <MethodCard
              icon={UserPlus}
              title="Usuarios / peones"
              description="Acceso por WhatsApp para cargar datos de campo sin exponer la administración ni la configuración."
              onClick={() => router.push("/dashboard/team")}
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={activeStep === 0 || uploading !== null} onClick={() => setActiveStep((s) => s - 1)}>
          <ArrowLeft size={14} />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Paso {activeStep + 1} de {STEPS.length}
        </span>
        {activeStep === STEPS.length - 1 ? (
          <Button onClick={() => router.push("/dashboard/summary")}>
            <CheckCircle2 size={14} />
            Ir al resumen
          </Button>
        ) : (
          <Button disabled={uploading !== null || (activeStep === 0 && !hasPastures)} onClick={() => setActiveStep((s) => s + 1)}>
            Siguiente
            <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

function MethodCard({
  icon: Icon,
  title,
  description,
  badge,
  onClick,
  footer,
}: {
  icon: typeof Upload;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  footer?: ReactNode;
}) {
  return (
    <Card className="relative rounded-2xl shadow-soft">
      {badge ? (
        <span className="absolute -top-2 right-3 rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
          {badge}
        </span>
      ) : null}
      <CardContent>
        <button type="button" onClick={onClick} className="flex w-full flex-col items-start gap-2 text-left">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon size={18} />
          </span>
          <p className="font-heading text-sm font-bold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </button>
        {footer}
      </CardContent>
    </Card>
  );
}

function InfoCard({ icon: Icon, title, description }: { icon: typeof Upload; title: string; description: string }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="flex flex-col items-start gap-2">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon size={18} />
        </span>
        <p className="font-heading text-sm font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
