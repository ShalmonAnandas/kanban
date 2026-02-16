import { NextResponse } from 'next/server'

import { getUserId } from '@/lib/session'

export async function GET(request: Request) {
  try {
    await getUserId()
    const url = new URL(request.url)
    const redirectTo = url.searchParams.get('redirect_to')
    let safeRedirect = '/'

    if (redirectTo) {
      let redirectUrl: URL

      try {
        redirectUrl = new URL(redirectTo, url)
      } catch (redirectError) {
        console.warn('Invalid redirect_to parameter:', redirectError)
        return NextResponse.json(
          { error: 'Invalid redirect_to parameter' },
          { status: 400 }
        )
      }

      const isSafeRedirect =
        redirectUrl.origin === url.origin &&
        redirectTo.startsWith('/') &&
        !redirectTo.startsWith('//') &&
        !redirectTo.includes('\\')

      if (isSafeRedirect) {
        safeRedirect = `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
      }
    }

    return NextResponse.redirect(new URL(safeRedirect, request.url))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error initializing session:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to initialize session' },
      { status: 500 }
    )
  }
}
