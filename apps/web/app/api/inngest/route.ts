import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processWhatsAppMessage } from "@/inngest/functions/process-whatsapp-message";
import { sendWeeklySummary } from "@/inngest/functions/send-weekly-summary";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processWhatsAppMessage, sendWeeklySummary],
});
