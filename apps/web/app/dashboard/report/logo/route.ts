import { getReportLogo } from "@repo/core";
import { requireUser } from "@/lib/session";

/** El logo de los informes de quien está en la sesión, para verlo en el diálogo. */
export async function GET() {
  const user = await requireUser();
  const logo = await getReportLogo(user.id);
  if (!logo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(logo.data), {
    headers: { "Content-Type": logo.mimeType, "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
