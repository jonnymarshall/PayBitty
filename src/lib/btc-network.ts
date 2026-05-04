export const BTC_NETWORK = process.env.NEXT_PUBLIC_BTC_NETWORK ?? "mainnet";

export function getMempoolBaseUrl(): string {
  return BTC_NETWORK === "testnet4"
    ? "https://mempool.space/testnet4"
    : "https://mempool.space";
}

export function getMempoolWsUrl(): string {
  return BTC_NETWORK === "testnet4"
    ? "wss://mempool.space/testnet4/api/v1/ws"
    : "wss://mempool.space/api/v1/ws";
}

export function mempoolTxUrl(txid: string): string {
  return `${getMempoolBaseUrl()}/tx/${txid}`;
}

export function mempoolAddressUrl(address: string): string {
  return `${getMempoolBaseUrl()}/address/${address}`;
}
