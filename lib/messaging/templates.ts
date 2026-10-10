/**
 * Built-in SMS wording per message kind. Hospitals can override any of them
 * (message_templates). {when} is "today" or "tomorrow" (reminders only).
 * Kept in plain GSM characters (no ₦, curly quotes or
 * emoji) so each fits one 160-character SMS segment — non-GSM characters
 * switch the whole message to Unicode, which allows only 70 per segment.
 */
export const MESSAGE_KINDS = {
  appointment_booked: {
    label: "Appointment booked",
    body: "Hello {patient}, your appointment at {hospital} is booked for {date} at {time} with {doctor}. Call us if you need to change it.",
  },
  reminder_24h: {
    label: "Reminder — day before",
    body: "Reminder: {patient}, you have an appointment at {hospital} {when}, {date} at {time}. Please arrive 15 minutes early.",
  },
  reminder_2h: {
    label: "Reminder — 2 hours before",
    body: "{patient}, your appointment at {hospital} is today at {time}. See you soon.",
  },
  results_ready: {
    label: "Results ready",
    body: "Hello {patient}, your {test} result from {hospital} is ready. View it in the patient portal or discuss it with your doctor at your next visit.",
  },
  payment_receipt: {
    label: "Payment receipt",
    body: "{hospital}: payment of NGN {amount} received from {patient}. Thank you.",
  },
} as const;

export type AutoMessageKind = keyof typeof MESSAGE_KINDS;
export const AUTO_KINDS = Object.keys(MESSAGE_KINDS) as AutoMessageKind[];
export const PLACEHOLDERS = ["{patient}", "{hospital}", "{when}", "{date}", "{time}", "{doctor}", "{test}", "{amount}"];

/** Fills {placeholders}; unknown ones are left out cleanly. */
export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])))
    .replace(/\s+([,.])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** 160 chars per segment for GSM-7 text, 70 if any non-GSM character is present. */
export function smsSegments(text: string): { chars: number; segments: number; unicode: boolean } {
  const unicode = /[^\x00-\x7F£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤¡ÄÖÑÜ§¿äöñüà€]/.test(text);
  const per = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const chars = text.length;
  return { chars, segments: chars <= per ? 1 : Math.ceil(chars / multi), unicode };
}
