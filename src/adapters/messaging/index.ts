import { mockMessaging } from "./mock";

export type MessageChannel = "email" | "sms" | "whatsapp";

export type OutboundMessage = {
  tenantId: string;
  channel: MessageChannel;
  to: string;
  subject?: string;
  body: string;
  /** e.g. reservation id, so the outbox screen can link back. */
  reference?: string;
};

export interface Messaging {
  send(message: OutboundMessage): Promise<{ id: string }>;
}

/** Nothing is ever delivered: the mock records messages in the in-app outbox. */
export function getMessaging(): Messaging {
  return mockMessaging;
}
