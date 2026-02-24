import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL environment variable is not set')
    }
    _sql = neon(process.env.NEON_DATABASE_URL)
  }
  return _sql(strings, ...values)
}

let schemaInitialized = false

/**
 * Ensures the database schema is initialized.
 * Only runs once per cold start. Gracefully skips during build if DB URL is not available.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return
  if (!process.env.NEON_DATABASE_URL) {
    // During build, skip schema initialization
    return
  }
  const { initSchema } = await import('./db-schema')
  await initSchema()
  schemaInitialized = true
}

export default sql
