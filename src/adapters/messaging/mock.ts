import "server-only";
import { createAdminClient } from "@/server/admin";
import type { Messaging, OutboundMessage } from "./index";

/** Writes to the outbox table (migration 0008) instead of sending. */
export const mockMessaging: Messaging = {
  async send(message: OutboundMessage) {
    const { data, error } = await createAdminClient()
      .from("outbox")
      .insert({
        tenant_id: message.tenantId,
        channel: message.channel,
        recipient: message.to,
        subject: message.subject ?? null,
        body: message.body,
        reference: message.reference ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id as string };
  },
};
