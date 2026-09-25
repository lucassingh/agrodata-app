import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listRecordsPage, getTeamMembers } from "@repo/core";
import { HeroBanner } from "@/components/hero-banner";
import { DataClient } from "./data-client";

export const metadata: Metadata = {
  title: "Datos — AgroData",
};

const PAGE_SIZES = [10, 25, 50];

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; tab?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const tab: "all" | "mine" = params.tab === "mine" ? "mine" : "all";
  const pageSize = PAGE_SIZES.includes(Number(params.size)) ? Number(params.size) : PAGE_SIZES[0]!;
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0);

  const [{ records, total }, teamMembers] = user.activeTenantId
    ? await Promise.all([
        listRecordsPage(user.activeTenantId, { page, pageSize, userId: tab === "mine" ? user.id : undefined }),
        getTeamMembers(user.activeTenantId),
      ])
    : [{ records: [], total: 0 }, []];

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
          rawMessage: r.rawMessage,
        }))}
        teamMembers={teamMembers
          .filter((m) => m.status === "ACTIVE")
          .map((m) => ({ userId: m.userId, fullName: m.fullName }))}
        total={total}
        page={page}
        pageSize={pageSize}
        pageSizes={PAGE_SIZES}
        tab={tab}
        hasActiveTenant={Boolean(user.activeTenantId)}
        currentUserId={user.id}
        currentUserName={user.name ?? "Vos"}
        canDelete={user.capabilities.canDeleteOperationalData}
      />
    </div>
  );
}
