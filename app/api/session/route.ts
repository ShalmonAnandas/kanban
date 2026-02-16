import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { getUserId, USER_COOKIE_NAME } from '@/lib/session'

export async function GET(req: Request) {
  try {
    await getUserId()
    const cookieStore = await cookies()

    if (!cookieStore.get(USER_COOKIE_NAME)) {
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
