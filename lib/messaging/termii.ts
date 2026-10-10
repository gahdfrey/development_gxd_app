import type { MessagingGateway, SendInput, SendResult } from "./gateway";

/**
 * Termii (Nigerian SMS provider) — https://developers.termii.com
 * POST {base}/api/sms/send with { api_key, to, from, sms, type: "plain", channel }.
 * channel "dnd" delivers to numbers on the DND register (transactional
 * route, needs Termii approval); "generic" does not reach DND numbers.
 */
export class TermiiGateway implements MessagingGateway {
  readonly provider = "termii";
  readonly live = true;

  constructor(
    private apiKey: string,
    private baseUrl: string,
    private channel: string,
    private defaultSenderId: string | null,
  ) {}

  async send(input: SendInput): Promise<SendResult> {
    const from = input.senderId || this.defaultSenderId;
    if (!from) return { ok: false, providerRef: null, error: "No SMS sender ID configured" };
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: this.apiKey, to: input.to, from, sms: input.body, type: "plain", channel: this.channel }),
      });
      const data = (await res.json().catch(() => ({}))) as { message_id?: string; message?: string; code?: string };
      if (!res.ok || !data.message_id) {
        return { ok: false, providerRef: null, error: data.message || `Termii HTTP ${res.status}` };
      }
      return { ok: true, providerRef: data.message_id };
    } catch (err) {
      return { ok: false, providerRef: null, error: err instanceof Error ? err.message : "Network error" };
    }
  }
}
