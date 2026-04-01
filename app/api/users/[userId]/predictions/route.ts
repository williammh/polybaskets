import { NextRequest, NextResponse } from "next/server"
import { polymarketAPI } from "@/lib/polymarket"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "Missing user parameter" }, { status: 400 });
    }

    const data = await polymarketAPI.getUserTradedMarkets(userId)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in traded markets API:", error);
    return NextResponse.json({ error: "Failed to fetch traded markets" }, { status: 500 });
  }
}