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

    const { searchParams } = new URL(request.url)
    const getTags = searchParams.get('getTags') === 'true'

    const data = await polymarketAPI.getOpenPositions({ user: userId }, getTags);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in getOpenPositions API:", error);
    return NextResponse.json({ error: "Failed to fetch open positions" }, { status: 500 });
  }
}