import { cookies } from 'next/headers'
import { createUser, findUserById } from './db-queries'
import { ensureSchema } from './db'

export const USER_COOKIE_NAME = 'kanban_user_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
export const SESSION_INIT_PATH = '/api/session'

export async function getUserIdFromCookie(): Promise<string | null> {
  await ensureSchema()
  const cookieStore = await cookies()
  return cookieStore.get(USER_COOKIE_NAME)?.value ?? null
}

export async function getUserId(): Promise<string> {
  await ensureSchema()
  const cookieStore = await cookies()
  const userId = cookieStore.get(USER_COOKIE_NAME)?.value

  if (userId) {
    return userId
  }

  // Create a new anonymous user
  const user = await createUser()
  const newUserId = user.id
  
  // Set cookie
  cookieStore.set(USER_COOKIE_NAME, newUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return newUserId
}

export async function getOrCreateUser() {
  const userId = await getUserId()
  
  // Verify user exists, create if not
  let user = await findUserById(userId)

  if (!user) {
    user = await createUser(userId)
  }

  return user
}
