import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

const DB_URL_ENV_NAMES = [
  // 1. Prioritize unpooled connections first (Required for Neon HTTP driver)
  'NEON_DATABASE_URL_UNPOOLED',
  'NEON_POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  
  // 2. Fallbacks (Vercel will likely inject these, but they are usually pooled)
  'NEON_DATABASE_URL',
  'NEON_POSTGRES_URL',
  'POSTGRES_URL',
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
] as const

/**
 * Normalizes a Postgres connection string to use the `postgresql://` scheme
 * required by the `neon()` driver (some providers emit `postgres://` instead).
 */
export function normalizePostgresUrl(url: string): string {
  return url.replace(/^postgres:\/\//, 'postgresql://')
}

/**
 * Returns true if `url` looks like a valid Postgres connection string that
 * the neon() driver will accept (postgresql:// or postgres:// with user, host
 * and database path components).
 */
function isValidPostgresUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') &&
      !!parsed.hostname &&
      !!parsed.pathname &&
      parsed.pathname !== '/'
    )
  } catch {
    return false
  }
}

/**
 * Resolves the Neon database URL from Vercel-provided environment variables.
 * Tries pooled URLs first (better for serverless), then falls back to unpooled.
 * Skips env vars whose values are not valid Postgres connection strings.
 */
export function getNeonDatabaseUrl(): string | undefined {
  for (const name of DB_URL_ENV_NAMES) {
    const val = process.env[name]
    if (val && isValidPostgresUrl(val)) return normalizePostgresUrl(val)
  }
  return undefined
}

let _sql: NeonQueryFunction<false, false> | null = null

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    const url = getNeonDatabaseUrl()
    if (!url) {
      throw new Error(
        `No Neon database URL found. Set one of: ${DB_URL_ENV_NAMES.join(', ')}`
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
