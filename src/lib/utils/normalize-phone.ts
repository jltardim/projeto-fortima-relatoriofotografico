/**
 * Normalizes a phone number by stripping everything except digits.
 * "+5522998712937" → "5522998712937"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
