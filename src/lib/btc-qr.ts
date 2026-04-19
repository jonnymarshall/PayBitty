export function buildBip21Uri(
  address: string,
  btcAmount: number,
  label?: string
): string {
  const params = new URLSearchParams({ amount: formatBtcAmount(btcAmount) });
  if (label) params.set("label", label);
  return `bitcoin:${address}?${params.toString()}`;
}

export function fiatToBtc(fiatAmount: number, btcPriceInFiat: number): number {
  if (btcPriceInFiat <= 0) throw new Error("BTC price must be positive");
  return fiatAmount / btcPriceInFiat;
}

function formatBtcAmount(amount: number): string {
  return amount.toFixed(8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
