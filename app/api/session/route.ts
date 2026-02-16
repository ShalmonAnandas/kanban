import { NextResponse } from 'next/server'

import { getUserId } from '@/lib/session'

export async function GET(req: Request) {
  try {
    await getUserId()
    const url = new URL(req.url)
    const redirectTo = url.searchParams.get('redirect_to')
    const safeRedirect =
      redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/'

    return NextResponse.redirect(new URL(safeRedirect, req.url))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error initializing session:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to initialize session' },
      { status: 500 }
    )
  }
}
