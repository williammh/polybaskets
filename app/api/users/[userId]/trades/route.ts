import { NextRequest, NextResponse } from "next/server"
import { polymarketAPI } from "@/lib/polymarket"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const takerOnly = searchParams.get('takerOnly') === 'true' ? true : false;
    
    const trades = await polymarketAPI.getUserTrades(userId, {
      limit,
      offset,
      takerOnly
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error('Error fetching user trades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user trades' },
      { status: 500 }
    )
  }
}