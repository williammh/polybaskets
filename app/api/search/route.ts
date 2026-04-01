import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ events: [], profiles: [], tags: [] })
  }

  try {
    const apiUrl = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(query)}&search_profiles=true&limit_per_type=10`

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Resolution-Research/1.0',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Polymarket API error:', response.status, response.statusText)
      return NextResponse.json(
        { events: [], profiles: [], tags: [] },
        { status: response.status }
      )
    }

    const data = await response.json()
    // Only return profiles, filter out events and markets
    return NextResponse.json({
      profiles: data.profiles || [],
      events: [],
      tags: []
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { events: [], profiles: [], tags: [] },
      { status: 500 }
    )
  }
}