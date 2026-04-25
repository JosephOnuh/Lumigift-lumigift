/**
 * Normalizes a phone number to E.164 format.
 * Supports Nigerian numbers in the following formats:
 *   - +2348012345678  (already E.164)
 *   - 2348012345678   (international without +)
 *   - 08012345678     (local with leading 0)
 *   - 8012345678      (local without leading 0)
 *
 * Non-Nigerian numbers that already start with `+` and have 10–15 digits are
 * passed through unchanged.
 *
 * @param raw - The raw phone number string in any supported format.
 * @returns The E.164-formatted phone number (e.g. `"+2348012345678"`),
 *   or `null` if the input cannot be normalized to a valid E.164 string.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  let e164: string;

  if (digits.startsWith("234") && digits.length === 13) {
    // 2348012345678 → +2348012345678
    e164 = `+${digits}`;
  } else if (digits.startsWith("0") && digits.length === 11) {
    // 08012345678 → +2348012345678
    e164 = `+234${digits.slice(1)}`;
  } else if (digits.length === 10 && !digits.startsWith("0")) {
    // 8012345678 → +2348012345678
    e164 = `+234${digits}`;
  } else if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    // Already E.164 for any country
    e164 = `+${digits}`;
  } else {
    return null;
  }

  // Final sanity check: E.164 is + followed by 10–15 digits
  return /^\+[1-9]\d{9,14}$/.test(e164) ? e164 : null;
}
