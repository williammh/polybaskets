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

    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod') || undefined;
    const maxPages = searchParams.get('maxPages') ? parseInt(searchParams.get('maxPages')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const data = await polymarketAPI.getClosedPositions({ user: userId, offset }, timePeriod, maxPages);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in getClosedPositions API:", error);
    return NextResponse.json({ error: "Failed to fetch closed positions" }, { status: 500 });
  }
}