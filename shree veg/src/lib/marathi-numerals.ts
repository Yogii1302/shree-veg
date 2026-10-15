/**
 * Marathi Devanagari Numerals & Label Formatting Utilities
 * Shree Pure Veg - Admin Reporting & Analytics
 */

export const MARATHI_DIGITS: readonly string[] = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts any standard Arabic numeric digit (0-9) inside a string or number into Marathi Devanagari numerals (०-९).
 * Non-digit characters (commas, spaces, currency symbols, slashes) are preserved.
 *
 * @example
 * toMarathiNumerals(42) => '४२'
 * toMarathiNumerals('₹1,240') => '₹१,२४०'
 * toMarathiNumerals('14 Oct') => '१४ Oct'
 */
export function toMarathiNumerals(input: number | string | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (digit) => MARATHI_DIGITS[Number(digit)] || digit);
}

/**
 * Formats a value with optional Marathi numerals switch
 */
export function formatNum(
  val: number | string | null | undefined,
  useMarathiNumerals: boolean = false
): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return useMarathiNumerals ? toMarathiNumerals(str) : str;
}

/**
 * Formats Indian Currency (INR) with optional Marathi numerals
 */
export function formatInr(
  amount: number | string | null | undefined,
  useMarathiNumerals: boolean = false
): string {
  if (amount === null || amount === undefined) return '₹0';
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const formatted = `₹${num.toLocaleString('en-IN')}`;
  return useMarathiNumerals ? toMarathiNumerals(formatted) : formatted;
}
