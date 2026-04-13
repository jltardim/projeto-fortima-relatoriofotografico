// ──── Chatwoot API types (used by api.ts for sending messages) ────

export interface ChatwootConversation {
  id: number;
  inbox_id: number;
  contact_id: number;
  status: string;
}

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: number; // 0=incoming, 1=outgoing
  conversation_id: number;
  created_at: string;
  attachments?: ChatwootAttachment[];
}

export interface ChatwootAttachment {
  id: number;
  file_type: string;
  data_url: string;
}

export interface ChatwootContact {
  id: number;
  phone_number: string;
  name: string;
}

// ──── Webhook payload types ────

export interface WebhookPayload {
  event: string;
  id: number;
  content: string | null;
  content_type: string;
  message_type: "incoming" | "outgoing" | "template";
  sender: WebhookSender;
  inbox: { id: number; name: string };
  conversation: WebhookConversation;
  attachments?: WebhookAttachment[];
}

export interface WebhookSender {
  id: number;
  name: string;
  phone_number: string | null;
  email: string | null;
}

export interface WebhookConversation {
  id: number;
  inbox_id: number;
  status: string;
  additional_attributes?: Record<string, unknown>;
}

export interface WebhookAttachment {
  id: number;
  message_id: number;
  file_type: "image" | "video" | "audio" | "file";
  extension: string;
  content_type: string;
  data_url: string;
  thumb_url: string;
  file_size: number;
}

// ──── Legacy type (kept until polling.ts is deleted in Task 7) ────

export interface PolledMessage {
  messageId: number;
  content: string;
  createdAt: Date;
  conversationId: number;
  fileUrl: string;
  fileType: string;
  phoneNumber: string;
}
