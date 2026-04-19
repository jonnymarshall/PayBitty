const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  price: number;
  source: string;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function fetchBtcPrice(
  currency: string = "USD"
): Promise<{ price: number; source: string }> {
  const key = currency.toUpperCase();
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return { price: cached.price, source: cached.source };
  }

  const result =
    (await fetchFromCoinbase(key)) ?? (await fetchFromCoinGecko(key));

  if (!result) throw new Error(`Failed to fetch BTC price for ${key}`);

  cache.set(key, { ...result, cachedAt: now });
  return result;
}

async function fetchFromCoinbase(
  currency: string
): Promise<{ price: number; source: string } | null> {
  try {
    const res = await fetch(
      `https://api.coinbase.com/v2/prices/BTC-${currency}/spot`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const price = parseFloat(json.data?.amount);
    if (!isFinite(price)) return null;
    return { price, source: "coinbase" };
  } catch {
    return null;
  }
}

async function fetchFromCoinGecko(
  currency: string
): Promise<{ price: number; source: string } | null> {
  try {
    const lc = currency.toLowerCase();
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${lc}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const price = json.bitcoin?.[lc];
    if (typeof price !== "number") return null;
    return { price, source: "coingecko" };
  } catch {
    return null;
  }
}

export function clearPriceCache(): void {
  cache.clear();
}
