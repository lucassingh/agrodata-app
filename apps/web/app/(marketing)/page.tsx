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
    <div className="mx-auto flex max-w-5xl flex-col gap-24 px-6 py-24">
      <section className="flex flex-col items-start gap-6">
        <span className="text-sm font-medium text-muted-foreground">
          AgroData
        </span>
        <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          Organizá todo lo que pasa en tu campo con IA por WhatsApp.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Cargá siembra, animales, gastos y facturas desde el chat. Consultá
          en segundos y exportá reportes a Excel, sin cambiar tu rutina.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            href="/dashboard/sign-in"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Ingresar
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <Card key={step.title}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <span className="text-sm font-medium text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="font-heading text-lg font-medium">
                {step.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="border-t pt-12">
        <p className="max-w-2xl text-xl font-medium">
          Menos tiempo procesando. Más tiempo decidiendo.
        </p>
      </section>
    </div>
  );
}
