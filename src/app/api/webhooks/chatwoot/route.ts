import { NextRequest, NextResponse } from "next/server";

// Endpoint temporário para capturar e logar o payload do webhook do Chatwoot
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    console.log("=== WEBHOOK CHATWOOT RECEBIDO ===");
    console.log("Event:", payload.event);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    console.log("Payload completo:", JSON.stringify(payload, null, 2));
    console.log("=================================");

    return NextResponse.json({ status: "received" });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
