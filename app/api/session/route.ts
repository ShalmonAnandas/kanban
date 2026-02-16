import { NextResponse } from 'next/server'

import { getUserId } from '@/lib/session'

export async function GET(request: Request) {
  try {
    await getUserId()
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error) {
    console.error('Error initializing session:', error)
    return NextResponse.json(
      { error: 'Failed to initialize session' },
      { status: 500 }
    )
  }
}
