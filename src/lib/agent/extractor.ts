import OpenAI from "openai";
import { db } from "@/lib/db";

interface ObraWithFases {
  id: string;
  nome: string;
  fases: { id: string; nome: string }[];
}

interface ExtractionResult {
  obraId: string | null;
  obraNome: string | null;
  faseId: string | null;
  faseNome: string | null;
  confianca: "alta" | "media" | "baixa";
}

async function getOpenRouterClient(): Promise<{ client: OpenAI; model: string }> {
  const config = await db.llmConfig.findFirst();

  if (!config?.openrouterApiKey) {
    throw new Error("OpenRouter API key não configurada. Vá em Configurações > IA.");
  }

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openrouterApiKey,
  });

  return { client, model: config.openrouterModel };
}

export async function extractObraFase(
  messageText: string,
  obrasWithFases: ObraWithFases[]
): Promise<ExtractionResult> {
  if (!messageText || messageText.trim() === "") {
    return { obraId: null, obraNome: null, faseId: null, faseNome: null, confianca: "baixa" };
  }

  const obrasListText = obrasWithFases
    .map(
      (o) =>
        `- Obra "${o.nome}" (id: ${o.id}), fases: ${o.fases.map((f) => `"${f.nome}" (id: ${f.id})`).join(", ")}`
    )
    .join("\n");

  const prompt = `Voce recebeu uma mensagem de um mestre de obra que enviou uma foto de progresso.
Extraia o nome da obra e a fase da obra mencionados na mensagem.

Mensagem do mestre: "${messageText}"

Obras e fases cadastradas:
${obrasListText}

Responda APENAS com JSON valido, sem markdown:
{
  "obraId": "id exato da obra cadastrada ou null",
  "obraNome": "nome da obra ou null",
  "faseId": "id exato da fase cadastrada ou null",
  "faseNome": "nome da fase ou null",
  "confianca": "alta" | "media" | "baixa"
}

Regras:
- Use apenas IDs e nomes das obras/fases listadas acima
- Se a mensagem menciona claramente uma obra e fase, confianca = "alta"
- Se e ambiguo mas ha um provavel match, confianca = "media"
- Se nao conseguir identificar, retorne null e confianca = "baixa"`;

  try {
    const { client, model } = await getOpenRouterClient();

    const response = await client.chat.completions.create({
      model,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content || "";

    const parsed = JSON.parse(text.trim());
    return {
      obraId: parsed.obraId || null,
      obraNome: parsed.obraNome || null,
      faseId: parsed.faseId || null,
      faseNome: parsed.faseNome || null,
      confianca: parsed.confianca || "baixa",
    };
  } catch (error) {
    console.error("Erro na extracao LLM:", error);
    return { obraId: null, obraNome: null, faseId: null, faseNome: null, confianca: "baixa" };
  }
}
