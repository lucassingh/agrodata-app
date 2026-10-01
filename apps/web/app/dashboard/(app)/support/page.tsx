import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  accessInvitesByDemoRequest,
  DEMO_FIELD_COUNT_LABEL,
  DEMO_PROFILE_LABEL,
  getSupportMetrics,
  isPlatformStaff,
  listAccessInvites,
  listAccounts,
  listDemoRequests,
  METRIC_WEEKS,
  PLANS,
  waMeDigits,
} from "@repo/core";
import { requireUser } from "@/lib/session";
import { signupMode } from "@/lib/signup-mode";
import { AccessDialog } from "./access-dialog";
import { HeroBanner } from "@/components/hero-banner";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { DemoStatusSelect } from "./demo-status-select";
import { SubscriptionDialog } from "./subscription-dialog";

export const metadata: Metadata = {
  title: "Soporte — AgroData",
};

const TABS = [
  { id: "pedidos", label: "Pedidos de demo" },
  { id: "accesos", label: "Accesos" },
  { id: "cuentas", label: "Cuentas" },
  { id: "metricas", label: "Métricas" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Fecha y hora argentinas, con los espacios normalizados (ver CLAUDE.md §7.9). */
function formatMoment(date: Date | null): string {
  if (!date) return "—";
  return date
    .toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    })
    .replace(/\s+/g, " ");
}

/** Día argentino, dd/mm/aa. */
const formatDay = (date: Date) =>
  date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

const dayMonth = (isoDay: string) => `${isoDay.slice(8, 10)}/${isoDay.slice(5, 7)}`;

interface SupportPageProps {
  searchParams: Promise<{ tab?: string }>;
}

/** Panel de soporte (Etapa 6.2): solo para el equipo de AgroData (SUPER_ADMIN_EMAILS).
 *  A cualquier otra persona le responde como si la página no existiera. */
export default async function SupportPage({ searchParams }: SupportPageProps) {
  const user = await requireUser();
  if (!isPlatformStaff(user.email)) notFound();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "pedidos";

  return (
    <div className="space-y-6">
      <HeroBanner title="Soporte" subtitle="Solo para el equipo de AgroData: pedidos de demo, accesos, cuentas y cómo se usa el producto." />

      <nav aria-label="Secciones del panel" className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-soft sm:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/support?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "pedidos" ? <DemoRequests /> : null}
      {tab === "accesos" ? <AccessInvites /> : null}
      {tab === "cuentas" ? <Accounts /> : null}
      {tab === "metricas" ? <Metrics /> : null}
    </div>
  );
}

type AccessInviteRow = Awaited<ReturnType<typeof listAccessInvites>>[number];

/** Usado, vigente o vencido. */
function AccessStatus({ invite, now }: { invite: AccessInviteRow; now: Date }) {
  if (invite.usedAt) return <span className="font-medium text-primary">Se registró el {formatDay(invite.usedAt)}</span>;
  if (invite.expiresAt <= now) return <span className="text-[#8A5A12]">Venció el {formatDay(invite.expiresAt)}</span>;
  return <span>Vigente hasta el {formatDay(invite.expiresAt)}</span>;
}

async function DemoRequests() {
  const requests = await listDemoRequests();
  const invites = await accessInvitesByDemoRequest(requests.map((r) => r.id));
  const now = new Date();
  type Row = (typeof requests)[number];
  const columns: DataTableColumn<Row>[] = [
    { key: "date", label: "Fecha", className: "whitespace-nowrap", render: (r) => formatMoment(r.createdAt) },
    {
      key: "who",
      label: "Quién",
      render: (r) => (
        <div className="min-w-40">
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {DEMO_PROFILE_LABEL[r.profile as keyof typeof DEMO_PROFILE_LABEL] ?? r.profile} ·{" "}
            {(DEMO_FIELD_COUNT_LABEL[r.fieldCount as keyof typeof DEMO_FIELD_COUNT_LABEL] ?? r.fieldCount).toLowerCase()}
          </p>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contacto",
      render: (r) => (
        <div className="flex flex-col text-sm">
          <a className="text-primary underline-offset-2 hover:underline" href={`https://wa.me/${waMeDigits(r.whatsapp)}`} target="_blank" rel="noopener noreferrer">
            {r.whatsapp}
          </a>
          <a className="text-primary underline-offset-2 hover:underline" href={`mailto:${r.email}`}>
            {r.email}
          </a>
        </div>
      ),
    },
    { key: "message", label: "Mensaje", render: (r) => <p className="max-w-72 text-sm text-muted-foreground">{r.message ?? "—"}</p> },
    {
      key: "notified",
      label: "Email",
      className: "whitespace-nowrap",
      render: (r) => (r.notifiedAt ? "Enviado" : <span className="text-muted-foreground">No salió</span>),
    },
    { key: "status", label: "Estado", render: (r) => <DemoStatusSelect id={r.id} status={r.status} name={r.name} /> },
    {
      key: "access",
      label: "Acceso",
      render: (r) => {
        const invite = invites.get(r.id);
        return (
          <div className="flex min-w-36 flex-col items-start gap-1.5 text-sm">
            {invite ? <AccessStatus invite={invite} now={now} /> : null}
            {invite?.usedAt ? null : (
              <AccessDialog label={invite ? "Renovar acceso" : "Dar acceso"} demoRequestId={r.id} email={r.email} name={r.name} whatsapp={r.whatsapp} />
            )}
          </div>
        );
      },
    },
  ];
  if (requests.length === 0) return <Empty text="Todavía no llegó ningún pedido de demo." />;
  return <DataTable rows={requests} columns={columns} />;
}

async function AccessInvites() {
  const invites = await listAccessInvites();
  const now = new Date();
  const open = signupMode() === "open";
  const columns: DataTableColumn<AccessInviteRow>[] = [
    { key: "date", label: "Fecha", className: "whitespace-nowrap", render: (i) => formatMoment(i.createdAt) },
    {
      key: "who",
      label: "Persona",
      render: (i) => (
        <div className="min-w-40">
          <p className="font-medium">{i.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{i.email}</p>
        </div>
      ),
    },
    { key: "code", label: "Código", className: "whitespace-nowrap font-mono text-xs", render: (i) => i.token },
    { key: "origin", label: "Origen", className: "whitespace-nowrap", render: (i) => (i.demoRequestId ? "Pedido de demo" : "A mano") },
    { key: "status", label: "Estado", className: "whitespace-nowrap", render: (i) => <AccessStatus invite={i} now={now} /> },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">Registro {open ? "abierto" : "por invitación"}</strong> en este entorno.{" "}
          {open
            ? "Cualquiera puede crear una cuenta; un código igual queda marcado como usado."
            : "Solo se registra quien tiene un código de acceso o una invitación de un equipo."}{" "}
          Se cambia con <code className="font-mono text-xs">SIGNUP_MODE</code> en Vercel (y un deploy nuevo).
        </p>
        <AccessDialog label="Invitar a alguien" />
      </div>
      {invites.length === 0 ? <Empty text="Todavía no se dio ningún acceso." /> : <DataTable rows={invites} columns={columns} />}
    </div>
  );
}

async function Accounts() {
  const accounts = await listAccounts();
  type Row = (typeof accounts)[number];
  const columns: DataTableColumn<Row>[] = [
    {
      key: "who",
      label: "Persona",
      render: (a) => (
        <div className="min-w-40">
          <p className="font-medium">{a.name}</p>
          <p className="text-xs text-muted-foreground">{a.email ?? a.wNumber ?? "—"}</p>
        </div>
      ),
    },
    { key: "since", label: "Alta", className: "whitespace-nowrap", render: (a) => formatMoment(a.createdAt) },
    {
      key: "fields",
      label: "Campos",
      render: (a) =>
        a.fields.length === 0 ? (
          <span className="text-muted-foreground">Sin campos</span>
        ) : (
          <ul className="text-sm">
            {a.fields.map((f, i) => (
              <li key={i}>
                {f.name} <span className="text-muted-foreground">({f.role.toLowerCase()})</span>
              </li>
            ))}
          </ul>
        ),
    },
    { key: "last", label: "Última carga", className: "whitespace-nowrap", render: (a) => formatMoment(a.lastEntryAt) },
    {
      key: "plan",
      label: "Plan",
      render: (a) => (
        <div className="min-w-36 text-sm">
          <p className={cn("font-medium", a.plan.kind === "expired" && "text-[#8A5A12]")}>
            {a.plan.kind === "paid"
              ? `${PLANS[a.plan.plan].name} hasta el ${formatDay(a.plan.until)}`
              : a.plan.kind === "trial"
                ? `Prueba: ${a.plan.daysLeft === 1 ? "1 día" : `${a.plan.daysLeft} días`}`
                : "Vencido (modo lectura)"}
          </p>
          {a.requestedPlan ? (
            <p className="text-xs font-semibold text-primary">
              Pidió {PLANS[a.requestedPlan].name}
              {a.requestedAt ? ` el ${formatDay(a.requestedAt)}` : ""}
            </p>
          ) : null}
          {a.lastPayment?.appliedAt ? (
            <p className="text-xs text-muted-foreground">
              Pagó con Mercado Pago el {formatDay(a.lastPayment.appliedAt)} ($ {Math.round(a.lastPayment.amountArs).toLocaleString("es-AR")})
            </p>
          ) : null}
          {a.note ? <p className="max-w-56 text-xs text-muted-foreground">{a.note}</p> : null}
        </div>
      ),
    },
    {
      key: "manage",
      label: "",
      render: (a) => (
        <SubscriptionDialog
          userId={a.id}
          name={a.name}
          paidPlan={a.plan.kind === "paid" ? a.plan.plan : null}
          requestedPlan={a.requestedPlan}
          note={a.note}
        />
      ),
    },
  ];
  return <DataTable rows={accounts} columns={columns} />;
}

async function Metrics() {
  const { rows, totals } = await getSupportMetrics();
  const current = rows.at(-1)!;
  const kpis = [
    { label: "Personas", value: totals.users },
    { label: "Campos", value: totals.fields },
    { label: "Pedidos de demo nuevos", value: totals.newDemoRequests },
    { label: "Campos activos esta semana", value: current.activeFields },
    { label: "Registros por WhatsApp esta semana", value: current.whatsappRecords },
    { label: "Corregidos a mano esta semana", value: current.editedPct === null ? "—" : `${current.editedPct} %` },
  ];
  type Row = (typeof rows)[number];
  const columns: DataTableColumn<Row>[] = [
    { key: "week", label: "Semana", className: "whitespace-nowrap", render: (r) => `desde el ${dayMonth(r.week)}` },
    { key: "newUsers", label: "Personas nuevas", className: "text-right", render: (r) => r.newUsers },
    { key: "newFields", label: "Campos nuevos", className: "text-right", render: (r) => r.newFields },
    { key: "activated", label: "Activados", className: "text-right", render: (r) => (r.newFields > 0 ? `${r.activatedFields} de ${r.newFields}` : "—") },
    { key: "wa", label: "Registros WhatsApp", className: "text-right", render: (r) => r.whatsappRecords },
    { key: "web", label: "Registros web", className: "text-right", render: (r) => r.webRecords },
    { key: "edited", label: "WhatsApp corregidos", className: "text-right", render: (r) => (r.editedPct === null ? "—" : `${r.whatsappEdited} (${r.editedPct} %)`) },
    { key: "active", label: "Campos activos", className: "text-right", render: (r) => r.activeFields },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="rounded-2xl shadow-soft">
            <CardContent>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="font-heading text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <DataTable rows={[...rows].reverse()} columns={columns} />
      <p className="text-xs text-muted-foreground">
        Últimas {METRIC_WEEKS} semanas, de lunes a domingo. <strong className="font-medium text-foreground">Activado</strong>: el campo
        tiene potreros y un primer dato en su primera semana. <strong className="font-medium text-foreground">Corregidos</strong>: registros
        de WhatsApp que alguien editó en Datos (mide qué tan bien entiende la IA; los borrados no se cuentan). Las visitas a la landing
        están en Vercel → Analytics.
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
