/** Strip formatting; drop leading US country code 1 when present. */
export function normalizeUsPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** US numbers: 10 digits; area code and exchange cannot start with 0 or 1. */
export function isValidUsPhone(phone: string): boolean {
  const digits = normalizeUsPhoneDigits(phone);
  if (digits.length !== 10) return false;
  if (digits[0] === "0" || digits[0] === "1") return false;
  if (digits[3] === "0" || digits[3] === "1") return false;
  return true;
}

export function formatUsPhoneDisplay(phone: string): string {
  const digits = normalizeUsPhoneDigits(phone);
  if (digits.length !== 10) return phone.trim();
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const PHONE_VALIDATION_MESSAGE = "Use a 10-digit US number, including area code.";

/** Returns an error message when validation should be shown and the value is invalid. */
export function getPhoneValidationError(phone: string, shouldValidate: boolean): string | null {
  const trimmed = phone.trim();
  if (!shouldValidate || !trimmed) return null;
  return isValidUsPhone(trimmed) ? null : PHONE_VALIDATION_MESSAGE;
}
