import { cookies } from 'next/headers'
import prisma from './prisma'

export const USER_COOKIE_NAME = 'kanban_user_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
export const SESSION_INIT_PATH = '/api/session'

export async function getUserIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(USER_COOKIE_NAME)?.value ?? null
}

export async function getUserId(): Promise<string> {
  const cookieStore = await cookies()
  let userId = cookieStore.get(USER_COOKIE_NAME)?.value

  if (!userId) {
    // Create a new anonymous user
    const user = await prisma.user.create({
      data: {},
    })
    userId = user.id
    
    // Set cookie
    cookieStore.set(USER_COOKIE_NAME, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
  }

  return userId
}

export async function getOrCreateUser() {
  const userId = await getUserId()
  
  // Verify user exists, create if not
  let user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    user = await prisma.user.create({
      data: { id: userId },
    })
  }

  return user
}
