export function buildSpotPriceUrl(currency: string): string {
  return `https://api.coinbase.com/v2/prices/BTC-${currency.toUpperCase()}/spot`;
}
