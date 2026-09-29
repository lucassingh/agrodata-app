import "server-only";

/** Manda un email con Resend (https://resend.com), por su API directa. Sin
 *  RESEND_API_KEY (local sin configurar, CI) no manda nada y lo avisa en el log:
 *  quien llama decide qué hacer, nunca se corta lo que venía haciendo. */
export async function sendEmail(input: { to: string; subject: string; text: string }): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] sin RESEND_API_KEY: no se manda", { subject: input.subject });
    return { sent: false };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Sin dominio propio verificado en Resend, solo se puede mandar desde su
      // dirección de prueba y al email de la cuenta.
      from: process.env.EMAIL_FROM || "AgroData <onboarding@resend.dev>",
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) {
    console.error("[email] Resend rechazó el envío", { status: response.status, body: (await response.text()).slice(0, 300) });
    return { sent: false };
  }
  return { sent: true };
}
