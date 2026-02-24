import { findColumnsWithoutColor, setColumnColor } from '@/lib/db-queries'
import { getRandomPastelColor } from '@/lib/colors'

/**
 * Assigns random pastel colors to any columns that don't already have a color.
 * This ensures existing users' columns get colors retroactively.
 */
export async function backfillColumnColors(boardIds: string[]): Promise<void> {
  const columns = await findColumnsWithoutColor(boardIds)

  if (columns.length === 0) return

  await Promise.all(
    columns.map((col) => setColumnColor(col.id, getRandomPastelColor()))
  )
}
