import Image from "next/image";
import { ArrowRight, CalendarClock, FileSpreadsheet, FileText, Receipt, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import CountUp from "@/components/react-bits/CountUp";
import SpotlightCard from "@/components/react-bits/SpotlightCard";
import { cn } from "@/lib/utils";
import { TASK_TYPE_CONFIG, TASK_TYPE_ORDER } from "@/app/dashboard/(app)/tasks/task-constants";
import { TASK_TYPE_LABEL } from "@/app/dashboard/(app)/tasks/task-labels";
import { FEATURES_TITLE } from "./content";
import { Container, SectionTitle } from "./primitives";

// Todas las cifras de esta sección son datos de ejemplo para ilustrar la UI.

export function FeaturesBento() {
  return (
    <section id="producto" aria-labelledby="producto-title" className="scroll-mt-20 py-28 lg:py-36">
      <Container>
        <SectionTitle id="producto-title" className="max-w-[18ch]">
          {FEATURES_TITLE}
        </SectionTitle>

        <div className="mt-14 grid auto-rows-auto grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Cell
            className="md:col-span-2 lg:col-span-4 lg:row-span-2"
            title="Tu campo en un vistazo"
            body="Potreros, hectáreas, tareas y gastos, actualizados con cada mensaje."
          >
            <SummaryPreview />
          </Cell>

          <Cell className="lg:col-span-2" title="Potreros" body="Hectáreas, cultivos y animales de cada lote.">
            <PasturePreview />
          </Cell>

          <Cell className="lg:col-span-2" title="Tareas" body="Siembra, pulverización, fertilización y sanidad.">
            <TasksPreview />
          </Cell>

          <Cell className="lg:col-span-2" title="Facturas y audios" body="Una foto o un audio alcanzan. La IA extrae los datos.">
            <InvoicePreview />
          </Cell>

          <Cell
            tone="brand"
            className="lg:col-span-2"
            title="Preguntale a tu campo"
            body="Consultas en lenguaje natural, desde el mismo chat."
          >
            <AskPreview />
          </Cell>

          <Cell className="lg:col-span-2" title="Insumos" body="Stock al día y aviso antes de quedarte sin nada.">
            <SuppliesPreview />
          </Cell>

          <ExportCell />
        </div>
      </Container>
    </section>
  );
}

function Cell({
  title,
  body,
  children,
  className,
  tone = "light",
}: {
  title: string;
  body: string;
  children: ReactNode;
  className?: string;
  tone?: "light" | "brand";
}) {
  const brand = tone === "brand";
  return (
    <SpotlightCard
      spotlightColor={brand ? "rgba(255, 255, 255, 0.12)" : "rgba(82, 183, 136, 0.14)"}
      className={cn(
        "landing-reveal flex flex-col rounded-[16px] p-6 sm:p-7",
        brand ? "bg-l-brand-dark text-white" : "bg-l-surface text-l-ink",
        className,
      )}
    >
      <h3 className="relative font-heading text-xl font-semibold tracking-[-0.01em]">{title}</h3>
      <p className={cn("relative mt-1.5 max-w-[40ch] leading-relaxed", brand ? "text-white/80" : "text-l-ink-soft")}>{body}</p>
      <div className="relative mt-6 flex flex-1 flex-col justify-end">{children}</div>
    </SpotlightCard>
  );
}

const KPIS = [
  { label: "Potreros", value: 14, suffix: "" },
  { label: "Hectáreas", value: 1860, suffix: " ha" },
  { label: "Tareas pendientes", value: 6, suffix: "" },
  { label: "Registros este mes", value: 128, suffix: "" },
];

const EXPENSES = [
  { label: "Combustible", share: 36, color: "var(--chart-1)" },
  { label: "Semillas", share: 27, color: "var(--chart-2)" },
  { label: "Sanidad", share: 19, color: "var(--chart-3)" },
  { label: "Mano de obra", share: 18, color: "var(--chart-5)" },
];

const RECENT = [
  { text: "Siembra de soja, 100 ha en Potrero Norte", when: "Hace 5 min", ...TASK_TYPE_CONFIG.ORDEN_SIEMBRA },
  { text: "Vacunación aftosa, 45 terneros en El Bajo", when: "Hace 2 h", ...TASK_TYPE_CONFIG.TRATAMIENTO_SANITARIO },
  { text: "Factura de gasoil, Agro Pampa SRL", when: "Ayer", icon: Receipt, color: "#2D6A4F", bg: "#E8F5EE" },
];

function SummaryPreview() {
  return (
    <div className="rounded-[12px] bg-white p-5 shadow-l">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label}>
            <dt className="text-[13px] text-l-ink-soft">{kpi.label}</dt>
            <dd className="mt-1 font-heading text-[clamp(1.6rem,2.6vw,2.25rem)] leading-none font-bold tracking-[-0.02em] text-l-ink tabular-nums">
              <CountUp to={kpi.value} separator="." duration={1.4} />
              {kpi.suffix && <span className="text-lg font-semibold text-l-ink-soft">{kpi.suffix}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 border-t border-l-line pt-5">
        <p className="text-sm font-medium text-l-ink">Últimos datos</p>
        <ul className="mt-3 grid gap-2.5 text-sm">
          {RECENT.map((item) => (
            <li key={item.text} className="flex items-center gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: item.bg, color: item.color }}
              >
                <item.icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-l-ink">{item.text}</span>
              <span className="hidden shrink-0 text-l-ink-soft sm:inline">{item.when}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-l-line pt-5">
        <p className="text-sm font-medium text-l-ink">Distribución de gastos</p>
        <div className="mt-3 flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden>
          {EXPENSES.map((item) => (
            <span key={item.label} className="h-full rounded-full" style={{ width: `${item.share}%`, background: item.color }} />
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          {EXPENSES.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden />
              <span className="text-l-ink-soft">{item.label}</span>
              <span className="ml-auto font-medium text-l-ink tabular-nums">{item.share}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PasturePreview() {
  return (
    <div className="rounded-[12px] bg-white p-4 shadow-l">
      <div className="flex items-baseline justify-between">
        <p className="font-medium text-l-ink">Potrero Norte</p>
        <p className="text-sm text-l-ink-soft tabular-nums">120 ha</p>
      </div>
      <div className="mt-3 flex h-2 gap-1" aria-hidden>
        <span className="h-full w-2/3 rounded-full bg-[var(--chart-1)]" />
        <span className="h-full w-1/3 rounded-full bg-[var(--chart-5)]" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[13px]">
        <span className="rounded-full bg-l-brand-tint px-2.5 py-1 text-l-brand-dark">Soja · 80 ha</span>
        <span className="rounded-full bg-l-accent-tint px-2.5 py-1 text-l-ink">Maíz · 40 ha</span>
        <span className="rounded-full bg-l-surface px-2.5 py-1 text-l-ink-soft">Novillos · 35</span>
      </div>
    </div>
  );
}

function TasksPreview() {
  return (
    <ul className="grid gap-2">
      {TASK_TYPE_ORDER.map((type) => {
        const config = TASK_TYPE_CONFIG[type];
        const Icon = config.icon;
        return (
          <li key={type} className="flex items-center gap-3 rounded-[12px] bg-white px-3 py-2.5 shadow-l">
            <span className="flex size-8 items-center justify-center rounded-full" style={{ background: config.bg, color: config.color }}>
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="text-sm font-medium text-l-ink">{TASK_TYPE_LABEL[type]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function InvoicePreview() {
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-2 rounded-[12px] bg-white p-3 shadow-l">
        <Receipt className="size-8 text-l-brand" strokeWidth={1.5} aria-hidden />
        <span className="text-[11px] text-l-ink-soft">foto.jpg</span>
      </div>
      <ArrowRight className="size-5 shrink-0 self-center text-l-ink-soft" aria-hidden />
      <dl className="grid flex-1 gap-1.5 rounded-[12px] bg-white p-3 text-[13px] shadow-l">
        {[
          ["Proveedor", "Semillero El Trébol"],
          ["Monto", "USD 4.320"],
          ["Fecha", "18/09"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-l-ink-soft">{label}</dt>
            <dd className="truncate text-right font-medium text-l-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AskPreview() {
  return (
    <div className="grid gap-2 text-[14px] leading-snug">
      <p className="ml-auto w-fit max-w-[90%] rounded-[12px] rounded-tr-sm bg-l-wa-out px-3.5 py-2.5 text-l-ink">
        ¿Cuánto gasoil usé este mes?
      </p>
      <p className="w-fit max-w-[92%] rounded-[12px] rounded-tl-sm bg-white px-3.5 py-2.5 text-l-ink">
        En septiembre cargaste <strong className="font-semibold">1.240 litros</strong>, 180 menos que en agosto. La mayor parte fue
        en la siembra de La Loma.
      </p>
    </div>
  );
}

function SuppliesPreview() {
  return (
    <ul className="grid gap-2 text-sm">
      <li className="flex items-center gap-3 rounded-[12px] bg-l-accent-tint px-3 py-2.5">
        <TriangleAlert className="size-4 shrink-0 text-l-accent-strong" aria-hidden />
        <span className="font-medium text-l-ink">Glifosato</span>
        <span className="ml-auto text-l-ink tabular-nums">3 bidones</span>
      </li>
      <li className="flex items-center gap-3 rounded-[12px] bg-white px-3 py-2.5 shadow-l">
        <span className="size-4 shrink-0" aria-hidden />
        <span className="text-l-ink">Semilla de maíz</span>
        <span className="ml-auto text-l-ink-soft tabular-nums">42 bolsas</span>
      </li>
      <li className="flex items-center gap-3 rounded-[12px] bg-white px-3 py-2.5 shadow-l">
        <span className="size-4 shrink-0" aria-hidden />
        <span className="text-l-ink">Vacuna aftosa</span>
        <span className="ml-auto text-l-ink-soft tabular-nums">180 dosis</span>
      </li>
    </ul>
  );
}

function ExportCell() {
  return (
    <div className="landing-reveal relative overflow-hidden rounded-[16px] bg-l-ink text-white md:col-span-2 lg:col-span-6">
      <Image
        src="/landing/rodeo-aereo.jpg"
        alt="Rodeo de vacas visto desde arriba, caminando por un camino de ripio al atardecer"
        fill
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="object-cover object-center opacity-70 [mask-image:linear-gradient(90deg,transparent_20%,black_65%)]"
      />
      <div className="relative grid gap-8 p-6 sm:p-10 lg:max-w-[560px] lg:py-14">
        <div>
          <h3 className="font-heading text-[clamp(1.6rem,2.4vw,2.25rem)] leading-tight font-semibold tracking-[-0.02em]">
            Exportá todo y recibí un reporte cada semana
          </h3>
          <p className="mt-3 max-w-[44ch] leading-relaxed text-white/80">
            Planillas de Excel y PDF listas para tu contador, tu socio o el banco. Y un resumen de la semana todos los lunes.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm">
            <FileSpreadsheet className="size-4 text-l-brand-light" aria-hidden />
            Excel
          </li>
          <li className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm">
            <FileText className="size-4 text-l-brand-light" aria-hidden />
            PDF
          </li>
          <li className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm">
            <CalendarClock className="size-4 text-l-accent" aria-hidden />
            Reporte semanal, los lunes
          </li>
        </ul>
      </div>
    </div>
  );
}
