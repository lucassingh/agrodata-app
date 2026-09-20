import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listPastures } from "@repo/core";
import { HowStartClient } from "./how-start-client";

export const metadata: Metadata = {
  title: "Cómo empezar — AgroData",
};

export default async function HowStartPage() {
  const user = await requireUser();

  const pastures = user.activeTenantId ? await listPastures(user.activeTenantId) : [];

  return (
    <HowStartClient
      userName={user.name || "Productor"}
      hasActiveTenant={Boolean(user.activeTenantId)}
      hasPastures={pastures.length > 0}
    />
  );
}
