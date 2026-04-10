import { db } from "@/lib/db";
import type { ChatwootConversation, ChatwootMessage } from "./types";

async function getConfig() {
  const config = await db.chatwootConfig.findFirst();
  if (!config) throw new Error("Chatwoot nao configurado");
  return config;
}

async function chatwootFetch(path: string, options?: RequestInit) {
  const config = await getConfig();
  const url = `${config.baseUrl}/api/v1/accounts/${config.accountId}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      api_access_token: config.apiToken,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chatwoot API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function searchContactByPhone(
  phone: string
): Promise<{ id: number } | null> {
  const data = await chatwootFetch(`/contacts/search?q=${encodeURIComponent(phone)}`);
  const contacts = data.payload || [];
  return contacts.length > 0 ? { id: contacts[0].id } : null;
}

export async function findOrCreateConversation(
  contactId: number
): Promise<ChatwootConversation> {
  const config = await getConfig();

  // Search for existing open conversation
  const convData = await chatwootFetch(
    `/contacts/${contactId}/conversations`
  );
  const conversations = convData.payload || [];
  const existing = conversations.find(
    (c: ChatwootConversation) => c.inbox_id === config.inboxId && c.status === "open"
  );

  if (existing) return existing;

  // Create new conversation
  const newConv = await chatwootFetch("/conversations", {
    method: "POST",
    body: JSON.stringify({
      contact_id: contactId,
      inbox_id: config.inboxId,
    }),
  });

  return newConv;
}

export async function sendMessage(
  conversationId: number,
  content: string
): Promise<ChatwootMessage> {
  return chatwootFetch(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      message_type: "outgoing",
    }),
  });
}

export async function sendMessageToPhone(
  phone: string,
  content: string
): Promise<void> {
  const contact = await searchContactByPhone(phone);
  if (!contact) {
    console.error(`Contato nao encontrado no Chatwoot para telefone: ${phone}`);
    return;
  }

  const conversation = await findOrCreateConversation(contact.id);
  await sendMessage(conversation.id, content);
}
