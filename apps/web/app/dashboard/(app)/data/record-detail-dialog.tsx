"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { RecordRow } from "./types";
import { formatRecordDescription, formatRecordSource, recordDataEntries, recordEffects } from "./record-format";
import { getRecordConfig } from "./record-constants";

interface RecordDetailDialogProps {
  record: RecordRow;
  occurredAtLabel: string;
  userLabel: string;
  onClose: () => void;
}

export function RecordDetailDialog({ record, occurredAtLabel, userLabel, onClose }: RecordDetailDialogProps) {
  const config = getRecordConfig(record.type, record.data);
  const Icon = config.icon;
  const entries = recordDataEntries(record.data);
  const effects = recordEffects(record.data);
  const fromWhatsApp = record.source === "WHATSAPP";

  return (
    <Dialog open onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: config.bg, color: config.color }}
            >
              <Icon size={15} />
            </span>
            {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-base font-medium text-foreground">{formatRecordDescription(record)}</p>

          <dl className="grid grid-cols-3 gap-x-4 gap-y-1.5">
            <dt className="text-muted-foreground">Fecha</dt>
            <dd className="col-span-2">{occurredAtLabel}</dd>
            <dt className="text-muted-foreground">Origen</dt>
            <dd className="col-span-2">{formatRecordSource(record.source)}</dd>
            <dt className="text-muted-foreground">Usuario</dt>
            <dd className="col-span-2">{userLabel}</dd>
          </dl>

          {record.rawMessage ? (
            <section className="space-y-1.5">
              <h3 className="font-medium text-foreground">Mensaje original</h3>
              <p className="rounded-lg bg-muted px-3 py-2 whitespace-pre-wrap text-foreground">{record.rawMessage}</p>
            </section>
          ) : null}

          {entries.length > 0 ? (
            <section className="space-y-1.5">
              <h3 className="font-medium text-foreground">{fromWhatsApp ? "Lo que entendió la IA" : "Datos"}</h3>
              <dl className="grid grid-cols-3 gap-x-4 gap-y-1.5">
                {entries.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="col-span-2">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {fromWhatsApp ? (
            <section className="space-y-1.5">
              <h3 className="font-medium text-foreground">Qué se cargó en el sistema</h3>
              {effects.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {effects.map((effect) => (
                    <li key={effect}>{effect}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Nada: este registro quedó solo en el historial.</p>
              )}
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
