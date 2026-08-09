import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Cargá por WhatsApp",
    description:
      "Mandá un mensaje de texto, audio o una foto de la factura. AgroData lo convierte en un registro estructurado.",
  },
  {
    title: "Consultá en segundos",
    description:
      "Preguntá en lenguaje natural: cuánto stock queda, cuánto gasoil se usó, qué pasó en un potrero.",
  },
  {
    title: "Controlá desde el dashboard",
    description:
      "Editá, corregí y exportá a Excel. Multi-campo, roles por establecimiento y reportes semanales.",
  },
];

export default function MarketingHomePage() {
  return (
    <div className="flex flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Image
          src="/brand/logo.png"
          alt="AgroData"
          width={140}
          height={31}
          className="h-auto w-[120px]"
          priority
        />
        <Link
          href="/dashboard/sign-in"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Ingresar
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col items-start gap-6">
          <h1 className="max-w-xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Organizá todo lo que pasa en tu campo con IA por WhatsApp.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Cargá siembra, animales, gastos y facturas desde el chat. Consultá
            en segundos y exportá reportes a Excel, sin cambiar tu rutina.
          </p>
          <Link
            href="/dashboard/sign-in"
            className={cn(buttonVariants({ size: "lg" }), "mt-2")}
          >
            Ingresar
          </Link>
        </div>
        <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border shadow-medium">
          <Image
            src="/brand/bg-login.jpg"
            alt="Campo agrícola gestionado con AgroData"
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
            priority
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Card key={step.title} className="rounded-2xl shadow-soft">
              <CardContent className="flex flex-col gap-3 pt-6">
                <span className="font-heading text-sm font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {step.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl border-t border-border px-6 py-16">
        <p className="max-w-2xl font-heading text-xl font-semibold text-foreground">
          Menos tiempo procesando. Más tiempo decidiendo.
        </p>
      </section>
    </div>
  );
}
