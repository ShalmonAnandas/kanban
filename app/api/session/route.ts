import { NextResponse } from 'next/server'

import { getUserId, getUserIdFromCookie } from '@/lib/session'

export async function GET(req: Request) {
  try {
    await getUserId()
    const userId = await getUserIdFromCookie()

    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to initialize session' },
        { status: 500 }
      )
    }

    return NextResponse.redirect(new URL('/', req.url))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error initializing session:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to initialize session' },
      { status: 500 }
    )
  }
}
