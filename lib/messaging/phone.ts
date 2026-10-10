/**
 * International SMS number (digits only, no "+") from a patient's country
 * code and phone as typed: "+234" + "0803 123 4567" → "2348031234567".
 * Returns null when it can't form a plausible number.
 */
export function toMsisdn(countryCode: string | null | undefined, phone: string | null | undefined): string | null {
  const cc = (countryCode ?? "+234").replace(/\D/g, "") || "234";
  let digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(cc) && digits.length > cc.length + 6) return digits.length <= 15 ? digits : null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  const full = cc + digits;
  if (cc === "234" && full.length !== 13) return null; // Nigerian mobiles: 234 + 10 digits
  return full.length >= 8 && full.length <= 15 ? full : null;
}
