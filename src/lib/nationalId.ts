const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC = "٠١٢٣٤٥٦٧٨٩";

export function toAsciiDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC.indexOf(d)));
}

export const NATIONAL_ID_ERROR = "کد ملی باید دقیقاً ۱۰ رقم باشد.";

// Empty input means "no national id" (the field is optional); otherwise it
// must be exactly 10 digits (Persian/Arabic digits are converted).
export function parseNationalId(
  raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  const text = toAsciiDigits(String(raw ?? "")).replace(/[\s‌‏‎]/g, "");
  if (!text) return { ok: true, value: null };
  if (!/^\d{10}$/.test(text)) return { ok: false, message: NATIONAL_ID_ERROR };
  return { ok: true, value: text };
}

// Official Iranian national-code checksum (used for pre-checks, not enforced
// by the forms: only the 10-digit rule is).
export function hasValidNationalIdChecksum(code: string): boolean {
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const sum = code
    .slice(0, 9)
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;
  const check = Number(code[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}
