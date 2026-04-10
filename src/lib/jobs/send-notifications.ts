import { db } from "@/lib/db";
import { sendMessageToPhone } from "@/lib/chatwoot/api";

export async function sendNotifications(): Promise<{
  sent: number;
  errors: number;
}> {
  const config = await db.notificacaoConfig.findFirst({
    where: { ativo: true },
  });

  if (!config) {
    console.log("[send-notifications] Nenhuma configuracao ativa");
    return { sent: 0, errors: 0 };
  }

  // Check if today is a scheduled day
  const today = new Date().getDay(); // 0=dom, 1=seg, ..., 6=sab
  if (!config.diasSemana.includes(today)) {
    console.log("[send-notifications] Hoje nao e dia de envio");
    return { sent: 0, errors: 0 };
  }

  const contatos = await db.contato.findMany({
    where: { chatwootContactId: { not: null } },
    include: {
      obras: { include: { obra: { select: { nome: true } } } },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const contato of contatos) {
    const obrasNomes = contato.obras.map((co) => co.obra.nome).join(", ");
    const mensagem = config.mensagemTemplate
      .replace("{nome}", contato.nome)
      .replace("{obras}", obrasNomes);

    try {
      await sendMessageToPhone(contato.telefone, mensagem);
      sent++;
      console.log(`[send-notifications] Enviado para ${contato.nome}`);
    } catch (error) {
      errors++;
      console.error(
        `[send-notifications] Erro ao enviar para ${contato.nome}:`,
        error
      );
    }
  }

  console.log(
    `[send-notifications] Concluido: ${sent} enviados, ${errors} erros`
  );
  return { sent, errors };
}
