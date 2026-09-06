/**
 * Prices are denominated in stablecoins, not ISO currencies, so we format
 * the number ourselves rather than relying on Intl's currency formatter
 * (which only knows ISO codes like "USD", not tickers like "USDC").
 */
export function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${currency.toUpperCase()}`;
}
