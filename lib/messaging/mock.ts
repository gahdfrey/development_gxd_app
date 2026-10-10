import type { MessagingGateway, SendInput, SendResult } from "./gateway";

/**
 * Default gateway: records the message as "sent" without contacting any
 * provider, so reminders, logs and templates can be built and tested with
 * no SMS account and no risk of texting real patients.
 */
export class MockMessagingGateway implements MessagingGateway {
  readonly provider = "mock";
  readonly live = false;

  async send(input: SendInput): Promise<SendResult> {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[sms:mock] to ${input.to} from ${input.senderId ?? "-"}: ${input.body}`);
    }
    return { ok: true, providerRef: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }
}
