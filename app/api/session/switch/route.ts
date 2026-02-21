import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { USER_COOKIE_NAME } from '@/lib/session'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Validate userId format (cuid)
    if (!/^c[a-z0-9]{20,}$/i.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user identifier format' },
        { status: 400 }
      )
    }

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Set the cookie to the new user ID
    const cookieStore = await cookies()
    cookieStore.set(USER_COOKIE_NAME, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ success: true, userId })
  } catch (error) {
    console.error('Error switching session:', error)
    return NextResponse.json(
      { error: 'Failed to switch session' },
      { status: 500 }
    )
  }
}
