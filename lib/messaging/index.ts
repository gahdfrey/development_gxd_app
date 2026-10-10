import type { MessagingGateway } from "./gateway";
import { MockMessagingGateway } from "./mock";
import { TermiiGateway } from "./termii";

let cached: MessagingGateway | null = null;

/**
 * Selects the SMS gateway from SMS_GATEWAY. Defaults to the mock gateway
 * (nothing is really sent). Set SMS_GATEWAY=termii with TERMII_API_KEY
 * (and optionally TERMII_BASE_URL, TERMII_CHANNEL, TERMII_SENDER_ID) to go live.
 */
export function getMessagingGateway(): MessagingGateway {
  if (cached) return cached;
  const provider = process.env.SMS_GATEWAY?.trim().toLowerCase() || "mock";
  if (provider === "termii") {
    const key = process.env.TERMII_API_KEY;
    if (!key) throw new Error("TERMII_API_KEY is required when SMS_GATEWAY=termii");
    cached = new TermiiGateway(
      key,
      process.env.TERMII_BASE_URL || "https://api.ng.termii.com",
      process.env.TERMII_CHANNEL || "generic",
      process.env.TERMII_SENDER_ID || null,
    );
  } else {
    cached = new MockMessagingGateway();
  }
  return cached;
}

export type { MessagingGateway } from "./gateway";
