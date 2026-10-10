export interface SendInput {
  /** E.164 digits without "+", e.g. "2348031234567". */
  to: string;
  body: string;
  /** Approved alphanumeric sender ID (max 11 chars), e.g. "DLEVENTH". */
  senderId: string | null;
}

export interface SendResult {
  ok: boolean;
  providerRef: string | null;
  error?: string;
}

/**
 * An SMS gateway sends one text message. Keeping this interface narrow (like
 * lib/payments/gateway.ts) lets the provider — Termii today, Twilio or a
 * WhatsApp Business provider later — be swapped without touching the
 * reminder job, the message log or the UI.
 */
export interface MessagingGateway {
  readonly provider: string;
  /** True when messages actually leave the system (false for the mock). */
  readonly live: boolean;
  send(input: SendInput): Promise<SendResult>;
}
