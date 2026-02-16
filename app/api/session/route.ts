import { NextResponse } from 'next/server'

import { getUserId } from '@/lib/session'

export async function GET(request: Request) {
  try {
    await getUserId()
    const url = new URL(request.url)
    const redirectTo = url.searchParams.get('redirect_to')
    let redirectUrlTarget = new URL('/', url)

    if (redirectTo) {
      let redirectUrl: URL

      try {
        redirectUrl = new URL(redirectTo, url)
      } catch {
        console.warn('Invalid redirect_to parameter received:', redirectTo)
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
        redirectUrlTarget = redirectUrl
      }
    }

    return NextResponse.redirect(redirectUrlTarget)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error initializing session:', errorMessage)
    return NextResponse.json(
      { error: 'Failed to initialize session' },
      { status: 500 }
    )
  }
}
