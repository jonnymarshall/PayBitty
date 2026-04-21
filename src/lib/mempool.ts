import { getMempoolBaseUrl } from "./btc-network";

export interface MempoolTxStatus {
  confirmed: boolean;
  block_height?: number;
}

export interface MempoolVout {
  scriptpubkey_address?: string;
  value: number;
}

export interface MempoolTx {
  txid: string;
  status: MempoolTxStatus;
  vout: MempoolVout[];
}

export function txPaysToAddress(tx: MempoolTx, address: string): boolean {
  return tx.vout.some((o) => o.scriptpubkey_address === address);
}

export async function fetchAddressTxs(address: string): Promise<MempoolTx[]> {
  const base = getMempoolBaseUrl();
  const res = await fetch(`${base}/api/address/${address}/txs`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTx(txid: string): Promise<MempoolTx | null> {
  const base = getMempoolBaseUrl();
  const res = await fetch(`${base}/api/tx/${txid}`);
  if (!res.ok) return null;
  return res.json();
}
