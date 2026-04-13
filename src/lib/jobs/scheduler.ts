import cron, { type ScheduledTask } from "node-cron";
import { sendNotifications } from "./send-notifications";
import { retryFailedPhotos } from "./retry-photos";

let notificationTask: ScheduledTask | null = null;
let retryTask: ScheduledTask | null = null;
let initialized = false;

export async function initScheduler() {
  if (initialized) return;
  initialized = true;

  console.log("[scheduler] Inicializando...");

  // Retry failed photos every 5 minutes
  retryTask = cron.schedule("*/5 * * * *", async () => {
    console.log("[scheduler] Executando retry de fotos...");
    try {
      await retryFailedPhotos();
    } catch (error) {
      console.error("[scheduler] Erro no retry:", error);
    }
  });

  console.log("[scheduler] Retry de fotos agendado a cada 5 minutos");

  // Notification schedule is dynamic — checked every minute
  notificationTask = cron.schedule("* * * * *", async () => {
    try {
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
  retryTask?.stop();
  initialized = false;
  console.log("[scheduler] Parado");
}
