import { CircleCheck, Info, TriangleAlert } from "lucide-react";

const TONES = {
  success: { icon: CircleCheck, className: "border-primary/25 bg-primary/5 text-foreground" },
  warning: { icon: TriangleAlert, className: "border-[#D97706]/30 bg-[#FDF4E3] text-[#8A5A12]" },
  info: { icon: Info, className: "border-border bg-muted/60 text-foreground" },
} as const;

/** Aviso corto de las pantallas de ingreso (acceso anticipado, sin acceso web, etc.). */
export function Notice({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  const { icon: Icon, className } = TONES[tone];
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={`flex w-full max-w-[490px] gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${className}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
