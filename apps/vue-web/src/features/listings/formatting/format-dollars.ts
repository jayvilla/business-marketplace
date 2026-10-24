/**
 * Whole US dollars, the same rule as Angular's
 * `currency: 'USD' : 'symbol' : '1.0-0'`.
 *
 * The formatter is created once. A card calls it while rendering; it does
 * not build a new `Intl.NumberFormat` per amount.
 */
const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatDollars(amount: number): string {
  return wholeDollars.format(amount);
}
