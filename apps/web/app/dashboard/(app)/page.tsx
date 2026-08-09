import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardHomePage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Hola, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Esto es el punto de partida del dashboard en Next.js. Los módulos de
          potreros, tareas, gastos e insumos se migran en la Fase 2.
        </p>
      </div>
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Tu sesión</CardTitle>
          <CardDescription>Datos resueltos por Auth.js desde la base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            {session?.user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Rol de plataforma:</span>{" "}
            {session?.user?.platformRole}
          </p>
          <p>
            <span className="text-muted-foreground">Owner:</span>{" "}
            {session?.user?.isSuperAdmin ? "Sí" : "No"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
