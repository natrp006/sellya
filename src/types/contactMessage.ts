export type ContactMessageStatus = "new" | "read";

/** A message sent through the public contact form — the only inbound support channel, since there are no accounts/email. */
export interface ContactMessage {
  id: string;
  message: string;
  contactInfo: string | null;
  sessionId: string | null;
  status: ContactMessageStatus;
  createdAt: string;
}
