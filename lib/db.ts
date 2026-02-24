import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

const NEON_URL_ENV_NAMES = [
  'NEON_DATABASE_URL',
  'NEON_POSTGRES_URL',
  'NEON_DATABASE_URL_UNPOOLED',
  'NEON_POSTGRES_URL_NON_POOLING',
  'NEON_POSTGRES_URL_NO_SSL',
] as const

/**
 * Normalizes a Postgres connection string to use the `postgresql://` scheme
 * required by the `neon()` driver (some providers emit `postgres://` instead).
 */
export function normalizePostgresUrl(url: string): string {
  return url.replace(/^postgres:\/\//, 'postgresql://')
}

/**
 * Resolves the Neon database URL from Vercel-provided environment variables.
 * Tries pooled URLs first (better for serverless), then falls back to unpooled.
 */
export function getNeonDatabaseUrl(): string | undefined {
  for (const name of NEON_URL_ENV_NAMES) {
    const val = process.env[name]
    if (val) return normalizePostgresUrl(val)
  }
  return undefined
}

let _sql: NeonQueryFunction<false, false> | null = null

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    const url = getNeonDatabaseUrl()
    if (!url) {
      throw new Error(
        `No Neon database URL found. Set one of: ${NEON_URL_ENV_NAMES.join(', ')}`
      )
    }
    _sql = neon(url)
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
  if (!getNeonDatabaseUrl()) {
    // During build, skip schema initialization
    return
  }
  const { initSchema } = await import('./db-schema')
  await initSchema()
  schemaInitialized = true
}

export default sql
