import { NextResponse } from 'next/server'

import { getUserId } from '@/lib/session'

export async function GET(request: Request) {
  await getUserId()
  return NextResponse.redirect(new URL('/', request.url))
}
