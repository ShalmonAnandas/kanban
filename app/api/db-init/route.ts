import { NextResponse } from 'next/server'
import { initSchema } from '@/lib/db-schema'

/**
 * Database initialization endpoint.
 * Creates tables if they don't exist.
 * Safe to call multiple times (idempotent).
 */
export async function GET() {
  try {
    await initSchema()
    return NextResponse.json({ success: true, message: 'Database schema initialized' })
  } catch (error) {
    console.error('Error initializing database:', error)
    return NextResponse.json(
      { error: 'Failed to initialize database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
