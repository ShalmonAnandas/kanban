import prisma from '@/lib/prisma'
import { getRandomPastelColor } from '@/lib/colors'

/**
 * Assigns random pastel colors to any columns that don't already have a color.
 * This ensures existing users' columns get colors retroactively.
 */
export async function backfillColumnColors(boardIds: string[]): Promise<void> {
  const columns = await prisma.column.findMany({
    where: {
      boardId: { in: boardIds },
      color: null,
    },
    select: { id: true },
  })

  if (columns.length === 0) return

  await Promise.all(
    columns.map((col: { id: string }) =>
      prisma.column.update({
        where: { id: col.id },
        data: { color: getRandomPastelColor() },
      })
    )
  )
}
