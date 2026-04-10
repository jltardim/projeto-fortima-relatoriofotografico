import Anthropic from "@anthropic-ai/sdk";

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

const client = new Anthropic();

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
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

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
