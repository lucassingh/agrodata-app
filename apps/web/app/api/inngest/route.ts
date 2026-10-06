import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processWhatsAppMessage } from "@/inngest/functions/process-whatsapp-message";
import { sendWeeklySummary } from "@/inngest/functions/send-weekly-summary";
import { refreshExchangeRates } from "@/inngest/functions/refresh-exchange-rates";
import { sendDailyAlerts } from "@/inngest/functions/send-daily-alerts";
import { importUsersToClerk } from "@/inngest/functions/import-users-to-clerk";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processWhatsAppMessage, sendWeeklySummary, refreshExchangeRates, sendDailyAlerts, importUsersToClerk],
});
