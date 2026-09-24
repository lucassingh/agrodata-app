"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { demoRequestSchema, type DemoRequestInput } from "@repo/core/leads/demo-request.schema";
import RotatingText from "@/components/react-bits/RotatingText";
import { cn } from "@/lib/utils";
import { CTA, DEMO_CTA_LABEL } from "./content";
import { Container } from "./primitives";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

/** Sin backend todavía: se simula el envío y se muestra la confirmación en el lugar del form. */
const FAKE_SUBMIT_MS = 900;

export function DemoCta() {
  const reduceMotion = usePrefersReducedMotion();
  const [sentName, setSentName] = useState<string | null>(null);

  return (
    <section id="demo" aria-labelledby="demo-title" className="scroll-mt-20 py-6 lg:py-10">
      <Container>
        <div className="grid gap-12 overflow-hidden rounded-[16px] bg-l-brand-dark px-6 py-14 text-white sm:px-10 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:py-20">
          <div className="lg:col-span-5">
            <h2 id="demo-title" className="font-heading text-[clamp(2.2rem,4vw,3.75rem)] leading-[1.05] font-bold tracking-[-0.03em]">
              <span className="sr-only">Ordená tu campo desde esta semana</span>
              <span aria-hidden className="block">
                {CTA.titleStart}{" "}
                <RotatingText
                  texts={CTA.rotatingWords}
                  rotationInterval={2200}
                  auto={!reduceMotion}
                  staggerDuration={0.02}
                  mainClassName="inline-flex overflow-hidden rounded-[10px] bg-l-accent px-3 pb-1 text-l-ink"
                  splitLevelClassName="overflow-hidden"
                />
                <span className="block">{CTA.titleEnd}</span>
              </span>
            </h2>
            <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-white/80">{CTA.body}</p>
          </div>

          <div className="lg:col-span-7">
            <AnimatePresence mode="wait" initial={false}>
              {sentName === null ? (
                <motion.div key="form" exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}>
                  <DemoForm onSent={setSentName} />
                </motion.div>
              ) : (
                <motion.div
                  key="sent"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <SentMessage name={sentName} onReset={() => setSentName(null)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
}

function DemoForm({ onSent }: { onSent: (name: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DemoRequestInput>({ resolver: zodResolver(demoRequestSchema) });

  const onSubmit = async (data: DemoRequestInput) => {
    await new Promise((resolve) => setTimeout(resolve, FAKE_SUBMIT_MS));
    onSent(data.name.split(" ")[0] ?? data.name);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="Nombre y apellido" error={errors.name?.message}>
        {(props, invalid) => <input {...props} {...register("name")} autoComplete="name" className={inputClass(invalid)} />}
      </Field>
      <Field label="WhatsApp" hint="Con código de área, ej. 11 5555 1234" error={errors.whatsapp?.message}>
        {(props, invalid) => (
          <input {...props} {...register("whatsapp")} type="tel" inputMode="tel" autoComplete="tel" className={inputClass(invalid)} />
        )}
      </Field>
      <Field label="Email" error={errors.email?.message} className="sm:col-span-2">
        {(props, invalid) => <input {...props} {...register("email")} type="email" autoComplete="email" className={inputClass(invalid)} />}
      </Field>
      <Field label="Perfil" error={errors.profile?.message}>
        {(props, invalid) => (
          <select {...props} {...register("profile")} defaultValue="" className={inputClass(invalid)}>
            <option value="" disabled>
              Elegí una opción
            </option>
            {CTA.profileOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="¿Cuántos campos manejás?" error={errors.fieldCount?.message}>
        {(props, invalid) => (
          <select {...props} {...register("fieldCount")} defaultValue="" className={inputClass(invalid)}>
            <option value="" disabled>
              Elegí una opción
            </option>
            {CTA.fieldCountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Contanos algo de tu campo (opcional)" error={errors.message?.message} className="sm:col-span-2">
        {(props, invalid) => <textarea {...props} {...register("message")} rows={3} className={cn(inputClass(invalid), "h-auto py-3")} />}
      </Field>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-l-brand-dark transition-[background-color,transform] duration-200 outline-none hover:bg-l-brand-tint focus-visible:ring-3 focus-visible:ring-l-accent focus-visible:ring-offset-2 focus-visible:ring-offset-l-brand-dark active:scale-[0.98] disabled:opacity-80 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
              Enviando…
            </>
          ) : (
            <>
              {DEMO_CTA_LABEL}
              <ArrowRight className="size-5" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

type FieldControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: FieldControlProps, invalid: boolean) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-white">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy }, Boolean(error))}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[13px] text-white/75">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-[#ffd79a]">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean) {
  return cn(
    "h-12 w-full rounded-[10px] border-2 bg-white px-4 text-base text-l-ink outline-none transition-colors duration-150 placeholder:text-l-ink-soft focus-visible:border-l-accent",
    invalid ? "border-[#ffd79a]" : "border-transparent",
  );
}

function SentMessage({ name, onReset }: { name: string; onReset: () => void }) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div role="status" className="flex h-full flex-col items-start justify-center rounded-[16px] bg-white/8 p-8 sm:p-12">
      <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
        <motion.circle
          cx="32"
          cy="32"
          r="29"
          fill="none"
          stroke="var(--l-accent)"
          strokeWidth="3"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d="M20 33 L28.5 41.5 L45 24"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <h3 className="mt-8 font-heading text-[clamp(1.8rem,3vw,2.6rem)] leading-tight font-bold tracking-[-0.02em]">
        ¡Listo, {name}! Recibimos tu pedido.
      </h3>
      <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-white/85">
        Te escribimos por WhatsApp en menos de 24 horas hábiles para coordinar la demo con un caso real de tu campo.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-8 rounded-full text-sm font-medium text-white underline underline-offset-4 outline-none hover:text-l-brand-tint focus-visible:ring-3 focus-visible:ring-l-accent"
      >
        Enviar otro pedido
      </button>
    </div>
  );
}
