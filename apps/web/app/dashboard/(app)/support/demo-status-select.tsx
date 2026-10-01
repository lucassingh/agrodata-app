"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { DemoRequestStatus } from "@repo/database";
import { updateDemoRequestStatusAction } from "./actions";

const LABEL: Record<DemoRequestStatus, string> = { NEW: "Nuevo", CONTACTED: "Contactado", DISCARDED: "Descartado" };

/** Estado de un pedido de demo, editable desde la tabla. */
export function DemoStatusSelect({ id, status, name }: { id: string; status: DemoRequestStatus; name: string }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();

  const change = (next: DemoRequestStatus) => {
    const previous = value;
    setValue(next);
    start(async () => {
      const result = await updateDemoRequestStatusAction(id, next);
      if (!result.success) {
        setValue(previous);
        toast.error(result.error);
      }
    });
  };

  return (
    <select
      aria-label={`Estado del pedido de ${name}`}
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value as DemoRequestStatus)}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
    >
      {(Object.keys(LABEL) as DemoRequestStatus[]).map((s) => (
        <option key={s} value={s}>
          {LABEL[s]}
        </option>
      ))}
    </select>
  );
}
