import cron, { type ScheduledTask } from "node-cron";
import { sendNotifications } from "./send-notifications";
import { pollResponses } from "./poll-responses";

let notificationTask: ScheduledTask | null = null;
let pollingTask: ScheduledTask | null = null;
let initialized = false;

export async function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("[scheduler] Inicializando...");

  // Polling every 2 minutes
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MINUTES || "2", 10);
  pollingTask = cron.schedule(`*/${pollInterval} * * * *`, async () => {
    console.log("[scheduler] Executando polling...");
    try {
      await pollResponses();
    } catch (error) {
      console.error("[scheduler] Erro no polling:", error);
    }
  });

  console.log(`[scheduler] Polling agendado a cada ${pollInterval} minutos`);

  // Notification schedule is dynamic — checked every minute
  notificationTask = cron.schedule("* * * * *", async () => {
    try {
      // Import db dynamically to avoid circular deps
      const { db } = await import("@/lib/db");
      const config = await db.notificacaoConfig.findFirst({
        where: { ativo: true },
      });

      if (!config) return;

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      if (currentTime === config.horario) {
        console.log("[scheduler] Horario de envio! Enviando notificacoes...");
        await sendNotifications();
      }
    } catch (error) {
      console.error("[scheduler] Erro ao verificar notificacoes:", error);
    }
  });

  console.log("[scheduler] Verificacao de notificacoes agendada (cada minuto)");
}

export function stopScheduler() {
  notificationTask?.stop();
  pollingTask?.stop();
  initialized = false;
  console.log("[scheduler] Parado");
}
