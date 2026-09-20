import { redirect } from "next/navigation";

/** Puerto directo del legacy: "/" redirige siempre a "Cómo empezar"
 *  (Navigate to="/how-start" replace) -- reemplaza el placeholder de la
 *  Fase 1 (Slice 0), que ya cumplió su propósito de mostrar la sesión
 *  resuelta mientras el resto de los módulos no existía. */
export default function DashboardHomePage() {
  redirect("/dashboard/how-start");
}
