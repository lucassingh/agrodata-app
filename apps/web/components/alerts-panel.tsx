import Link from "next/link";
import { AlertOctagon, AlertTriangle, BellRing, CheckCircle2, Info, Settings2 } from "lucide-react";
import type { AlertSeverity, FieldAlert } from "@repo/core/alerts/alert-rules";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SEVERITY: Record<AlertSeverity, { label: string; icon: typeof Info; chip: string; iconColor: string }> = {
  critical: { label: "Urgente", icon: AlertOctagon, chip: "bg-destructive/10 text-destructive", iconColor: "text-destructive" },
  warning: { label: "Atención", icon: AlertTriangle, chip: "bg-[#FDF4E3] text-[#8A5A12]", iconColor: "text-[#D97706]" },
  info: { label: "Para mirar", icon: Info, chip: "bg-muted text-muted-foreground", iconColor: "text-muted-foreground" },
};

/** Los avisos del campo activo (Etapa 5), de lo más grave a lo más leve. Cada uno
 *  dice de qué datos sale. */
export function AlertsPanel({ alerts, canConfigure }: { alerts: FieldAlert[]; canConfigure: boolean }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 font-heading text-sm font-bold">
            <BellRing size={16} className="text-primary" aria-hidden />
            Avisos
            {alerts.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{alerts.length}</span>
            ) : null}
          </h2>
          {canConfigure ? (
            <Link
              href="/dashboard/preferences?tab=avisos"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Settings2 size={14} aria-hidden />
              Configurar
            </Link>
          ) : null}
        </div>

        {alerts.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 size={16} className="text-primary" aria-hidden />
            Sin avisos: nada necesita atención ahora. Si algo cambia, te avisamos acá y por WhatsApp.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((alert) => {
              const severity = SEVERITY[alert.severity];
              const Icon = severity.icon;
              return (
                <li key={alert.key} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Icon size={18} className={cn("mt-0.5 shrink-0", severity.iconColor)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                      {alert.title}
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", severity.chip)}>{severity.label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
