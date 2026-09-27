"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { seasonOf } from "@repo/core/economy/economy-math";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveSignatureAction } from "@/app/dashboard/(app)/_lib/report-actions";

export interface ReportSignature {
  fullName: string;
  profession: string | null;
  licenseNumber: string | null;
}

const argentinaDay = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

/** La campaña en curso y las dos anteriores («26/27», «25/26», «24/25»). */
function recentSeasons(today: string): string[] {
  const year = Number(today.slice(0, 4));
  return [0, 1, 2].map((back) => seasonOf(`${year - back}-${today.slice(5)}`));
}

/** Botón «Informe» + diálogo: período, comentario y firma. Descarga el PDF que
 *  arma /dashboard/report. */
export function ReportButton({
  tenantId,
  tenantName,
  signature,
  size = "default",
  variant = "default",
}: {
  tenantId: string;
  tenantName: string;
  signature: ReportSignature;
  size?: "default" | "sm";
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const today = argentinaDay();
  const seasons = recentSeasons(today);
  const [kind, setKind] = useState<"month" | "season">("month");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [season, setSeason] = useState(seasons[0]!);
  const [comment, setComment] = useState("");
  const [profession, setProfession] = useState(signature.profession ?? "");
  const [licenseNumber, setLicenseNumber] = useState(signature.licenseNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const generate = () => {
    setError(null);
    start(async () => {
      if (profession !== (signature.profession ?? "") || licenseNumber !== (signature.licenseNumber ?? "")) {
        const saved = await saveSignatureAction({ profession, licenseNumber });
        if (!saved.success) {
          setError(saved.error);
          return;
        }
        // Así los otros botones de la página traen la firma nueva.
        router.refresh();
      }
      const response = await fetch("/dashboard/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          period: kind === "month" ? { kind, month } : { kind, season },
          comment,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "No se pudo generar el informe.");
        return;
      }
      const blob = await response.blob();
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "informe.pdf";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Informe descargado.");
      setOpen(false);
    });
  };

  const openDialog = () => {
    setProfession(signature.profession ?? "");
    setLicenseNumber(signature.licenseNumber ?? "");
    setError(null);
    setOpen(true);
  };

  return (
    <>
      <Button size={size} variant={variant} onClick={openDialog} aria-label={`Informe de ${tenantName}`}>
        <FileText size={14} />
        Informe
      </Button>
      <Dialog open={open} onOpenChange={(next: boolean) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Informe de {tenantName}</DialogTitle>
            <DialogDescription>
              Un PDF con los gastos, la economía por lote, la hacienda y el tambo del período, según lo que se hace en el
              campo, con tu comentario y tu firma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Período</legend>
              <RadioGroup value={kind} onValueChange={(value: unknown) => setKind(value as "month" | "season")} className="flex gap-4">
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="month" /> Un mes
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="season" /> Una campaña (julio a junio)
                </Label>
              </RadioGroup>
              {kind === "month" ? (
                <Input
                  type="month"
                  aria-label="Mes del informe"
                  value={month}
                  max={today.slice(0, 7)}
                  onChange={(e) => setMonth(e.target.value)}
                />
              ) : (
                <Select
                  value={season}
                  onValueChange={(value: string | null) => value && setSeason(value)}
                  items={seasons.map((s) => ({ value: s, label: `Campaña ${s}` }))}
                >
                  <SelectTrigger aria-label="Campaña del informe" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((s) => (
                      <SelectItem key={s} value={s}>
                        Campaña {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="report-comment">Comentario (opcional)</Label>
              <Textarea
                id="report-comment"
                rows={5}
                maxLength={4000}
                placeholder="Recomendaciones, observaciones de la recorrida, próximos pasos…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Firma: {signature.fullName}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="report-profession" className="text-xs text-muted-foreground">
                    Profesión
                  </Label>
                  <Input
                    id="report-profession"
                    placeholder="Ing. Agrónomo"
                    maxLength={80}
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="report-license" className="text-xs text-muted-foreground">
                    Matrícula
                  </Label>
                  <Input
                    id="report-license"
                    placeholder="MP 1234"
                    maxLength={40}
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Se guardan para tus próximos informes.</p>
            </fieldset>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={pending} onClick={generate}>
              {pending ? "Generando…" : "Descargar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
