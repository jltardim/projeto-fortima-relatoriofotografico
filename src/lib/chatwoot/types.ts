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

export interface PolledMessage {
  messageId: number;
  content: string;
  createdAt: Date;
  conversationId: number;
  fileUrl: string;
  fileType: string;
  phoneNumber: string;
}
