import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listRecordsForUser, getTeamMembers } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { DataClient } from "./data-client";

export const metadata: Metadata = {
  title: "Datos — AgroData",
};

export default async function DataPage() {
  const user = await requireUser();

  const [records, teamMembers] = user.activeTenantId
    ? await Promise.all([listRecordsForUser(user.activeTenantId), getTeamMembers(user.activeTenantId)])
    : [[], []];

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Datos"
        subtitle="Listado de registros del campo con vista completa o solo los tuyos."
      />
      <DataClient
        records={records.map((r) => ({
          id: r.id,
          type: r.type,
          occurredAt: r.occurredAt,
          data: r.data,
          source: r.source,
          userId: r.userId,
        }))}
        teamMembers={teamMembers
          .filter((m) => m.status === "ACTIVE")
          .map((m) => ({ userId: m.userId, fullName: m.fullName }))}
        hasActiveTenant={Boolean(user.activeTenantId)}
        currentUserId={user.id}
        currentUserName={user.name ?? "Vos"}
      />
    </div>
  );
}
