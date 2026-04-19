import { type NextRequest, NextResponse } from "next/server";
import { fetchBtcPrice } from "@/lib/btc-price";

export async function GET(request: NextRequest) {
  const currency = request.nextUrl.searchParams.get("currency") ?? "USD";

  try {
    const result = await fetchBtcPrice(currency.toUpperCase());
    return NextResponse.json(result);
  } catch (err) {
    console.error("[btc-price] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch BTC price" },
      { status: 503 }
    );
  }
}
