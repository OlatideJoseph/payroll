/**
 * Formats an amount held in minor units (e.g. kobo) as a human-readable
 * currency string, e.g. formatMoney(150000, 'NGN') => 'NGN 1,500.00'.
 */
export function formatMoney(minorUnits: number, currency = 'NGN'): string {
  const major = (minorUnits / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${major}`;
}
