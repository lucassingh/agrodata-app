"use client";

import { motion, useInView } from "motion/react";
import { Check, CheckCheck, FileImage, MessageCircleQuestion, Mic, Pencil, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HOW_IT_WORKS } from "./content";
import { Container, SectionTitle } from "./primitives";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const VISUALS = [<SendVisual key="send" />, <ConfirmVisual key="confirm" />, <DashboardVisual key="dashboard" />];

/**
 * La única secuencia real de la página (por eso lleva numeración). En desktop la
 * lista de pasos queda fija y el paso activo cambia cuando su bloque cruza el
 * centro de la pantalla; en mobile cada paso se apila con su visual.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-20 bg-l-surface py-28 lg:py-36">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <SectionTitle id="como-funciona-title" className="max-w-[16ch]">
                {HOW_IT_WORKS.title}
              </SectionTitle>
              <ol className="mt-12 hidden gap-2 lg:grid">
                {HOW_IT_WORKS.steps.map((step, index) => (
                  <li
                    key={step.title}
                    aria-current={active === index ? "step" : undefined}
                    className={cn(
                      "flex gap-5 rounded-[16px] p-5 transition-colors duration-300",
                      active === index ? "bg-white shadow-l" : "bg-transparent",
                    )}
                  >
                    <StepNumber index={index} active={active === index} />
                    <div>
                      <h3 className={cn("font-heading text-xl font-semibold transition-colors duration-300", active === index ? "text-l-ink" : "text-l-ink-soft")}>
                        {step.title}
                      </h3>
                      <p className={cn("mt-1.5 max-w-[42ch] leading-relaxed transition-colors duration-300", active === index ? "text-l-ink-soft" : "text-l-ink-soft/70")}>
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="grid gap-10 lg:col-span-7 lg:gap-0">
            {HOW_IT_WORKS.steps.map((step, index) => (
              <StepBlock key={step.title} index={index} onActive={setActive}>
                <div className="mb-6 flex gap-4 lg:hidden">
                  <StepNumber index={index} active />
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-l-ink">{step.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-l-ink-soft">{step.body}</p>
                  </div>
                </div>
                {VISUALS[index]}
              </StepBlock>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function StepNumber({ index, active }: { index: number; active: boolean }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-base font-bold transition-colors duration-300",
        active ? "bg-l-brand text-white" : "bg-l-surface-2 text-l-ink-soft",
      )}
    >
      {index + 1}
    </span>
  );
}

function StepBlock({ index, onActive, children }: { index: number; onActive: (index: number) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const centered = useInView(ref, { margin: "-45% 0px -45% 0px" });

  useEffect(() => {
    if (centered) onActive(index);
  }, [centered, index, onActive]);

  return (
    <div ref={ref} className="flex flex-col justify-center lg:min-h-[78vh]">
      <div className="landing-reveal">{children}</div>
    </div>
  );
}

function VisualFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[16px] bg-l-wa-bg p-5 sm:p-8", className)}>{children}</div>
  );
}

function Bubble({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 380, damping: 30, delay }}
      className="ml-auto w-fit max-w-[88%] rounded-[12px] rounded-tr-sm bg-l-wa-out px-4 py-3 text-[15px] leading-snug text-l-ink shadow-sm"
    >
      {children}
    </motion.div>
  );
}

function SendVisual() {
  return (
    <VisualFrame className="grid gap-3">
      <Bubble>Se rompió la bomba del molino de La Loma, mañana viene el técnico</Bubble>
      <Bubble delay={0.12}>
        <div className="flex items-center gap-3">
          <Play className="size-4 fill-l-ink-soft text-l-ink-soft" aria-hidden />
          <span className="flex h-6 w-40 items-center gap-[3px]" aria-hidden>
            {[8, 14, 10, 20, 12, 22, 9, 17, 11, 19, 13, 8, 15, 10, 18, 7, 13, 9].map((h, i) => (
              <span key={i} className="w-[3px] rounded-full bg-l-ink-soft/60" style={{ height: h }} />
            ))}
          </span>
          <span className="text-sm text-l-ink-soft">0:23</span>
          <Mic className="size-4 text-l-brand" aria-hidden />
        </div>
        <span className="sr-only">Audio de 23 segundos</span>
      </Bubble>
      <Bubble delay={0.24}>
        <div className="flex items-center gap-3 rounded-lg bg-white/70 p-3">
          <FileImage className="size-9 text-l-brand" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="text-sm font-medium">factura_semillas.jpg</p>
            <p className="text-[13px] text-l-ink-soft">Foto de la factura del semillero</p>
          </div>
        </div>
      </Bubble>
      <p className="mt-1 flex items-center justify-end gap-1 text-[13px] text-l-ink-soft">
        Enviado desde el campo <CheckCheck className="size-4 text-[#53bdeb]" aria-hidden />
      </p>
    </VisualFrame>
  );
}

function ConfirmVisual() {
  return (
    <VisualFrame className="grid gap-3">
      <Bubble>Sembramos 60 ha de maíz ayer</Bubble>
      <div className="w-fit max-w-[92%] rounded-[12px] rounded-tl-sm bg-white px-4 py-3 text-[15px] leading-snug text-l-ink shadow-sm">
        <p className="flex items-center gap-2 font-medium">
          <MessageCircleQuestion className="size-4 text-l-accent-strong" aria-hidden />
          Detecté una siembra. ¿En qué potrero?
        </p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-l-ink-soft">Cultivo</dt>
          <dd>Maíz</dd>
          <dt className="text-l-ink-soft">Superficie</dt>
          <dd>60 ha</dd>
          <dt className="text-l-ink-soft">Fecha</dt>
          <dd>Ayer</dd>
          <dt className="text-l-ink-soft">Potrero</dt>
          <dd className="font-medium text-l-accent-strong">Falta este dato</dd>
        </dl>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Respuestas rápidas">
        {["Potrero Norte", "La Loma", "El Bajo"].map((option, index) => (
          <span
            key={option}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              index === 0 ? "bg-l-brand text-white" : "bg-white text-l-brand",
            )}
          >
            {option}
          </span>
        ))}
      </div>
      <div className="w-fit max-w-[92%] rounded-[12px] rounded-tl-sm bg-white px-4 py-3 text-[15px] shadow-sm">
        <p className="flex items-center gap-2">
          <Check className="size-4 text-l-brand" aria-hidden />
          Guardado en Potrero Norte.
          <Pencil className="ml-2 size-3.5 text-l-ink-soft" aria-hidden />
          <span className="text-sm text-l-ink-soft">Corregir</span>
        </p>
      </div>
    </VisualFrame>
  );
}

const ROWS = [
  { date: "24/09 10:42", entry: "Siembra de maíz, 60 ha en Potrero Norte", origin: "WhatsApp", user: "Martín R.", fresh: true },
  { date: "24/09 08:15", entry: "Compra de semillas, Semillero El Trébol", origin: "WhatsApp", user: "Lucía G.", fresh: false },
  { date: "23/09 17:30", entry: "Reparación bomba molino La Loma", origin: "WhatsApp", user: "Ramón P.", fresh: false },
  { date: "23/09 11:02", entry: "Vacunación aftosa, 45 terneros", origin: "Web", user: "Lucía G.", fresh: false },
];

function DashboardVisual() {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div className="overflow-hidden rounded-[16px] bg-white shadow-l">
      <div className="flex items-center justify-between border-b border-l-line px-5 py-4">
        <p className="font-heading text-lg font-semibold text-l-ink">Datos</p>
        <span className="rounded-full bg-l-brand-tint px-3 py-1 text-[13px] font-medium text-l-brand-dark">Estancia La Esperanza</span>
      </div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Registros recientes cargados por WhatsApp (datos de ejemplo)</caption>
        <thead className="text-[13px] text-l-ink-soft">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">Fecha</th>
            <th scope="col" className="px-2 py-3 font-medium">Entrada</th>
            <th scope="col" className="hidden px-2 py-3 font-medium sm:table-cell">Origen</th>
            <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Usuario</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, index) => (
            <motion.tr
              key={row.entry}
              initial={reduceMotion || !row.fresh ? false : { backgroundColor: "oklch(0.95 0.05 85 / 1)" }}
              whileInView={row.fresh ? { backgroundColor: "oklch(0.95 0.05 85 / 0.55)" } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 1.6, delay: 0.4 }}
              className={cn("border-t border-l-line/70", row.fresh && "font-medium")}
            >
              <td className="px-5 py-3 whitespace-nowrap text-l-ink-soft">{row.date}</td>
              <td className="px-2 py-3 text-l-ink">
                {row.entry}
                {index === 0 && <span className="ml-2 rounded-full bg-l-accent px-2 py-0.5 text-[11px] font-semibold text-l-ink">Nuevo</span>}
              </td>
              <td className="hidden px-2 py-3 text-l-ink-soft sm:table-cell">{row.origin}</td>
              <td className="hidden px-5 py-3 text-l-ink-soft md:table-cell">{row.user}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
