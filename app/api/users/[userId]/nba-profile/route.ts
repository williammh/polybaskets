import { NextRequest, NextResponse } from 'next/server'
import { getUserNBAProfile } from '@/lib/nba'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = request.nextUrl
    const timePeriod = searchParams.get('timePeriod') || undefined

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const profile = await getUserNBAProfile(userId, timePeriod)

    if (!profile) {
      return NextResponse.json({ error: 'NBA profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error('Error fetching NBA profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NBA profile' },
      { status: 500 }
    )
  }
}
