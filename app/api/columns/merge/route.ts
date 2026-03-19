import { NextResponse } from 'next/server'
import {
  findColumnOwnedBy,
  getLastTaskOrder,
  moveAllTasksToColumn,
  deleteColumn,
} from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { fromColumnId, toColumnId } = await request.json()

    if (!fromColumnId || !toColumnId) {
      return NextResponse.json(
        { error: 'fromColumnId and toColumnId are required' },
        { status: 400 }
      )
    }

    if (fromColumnId === toColumnId) {
      return NextResponse.json(
        { error: 'Cannot merge a column into itself' },
        { status: 400 }
      )
    }

    // Verify both columns belong to user
    const [fromColumn, toColumn] = await Promise.all([
      findColumnOwnedBy(fromColumnId, userId),
      findColumnOwnedBy(toColumnId, userId),
    ])

    if (!fromColumn) {
      return NextResponse.json(
        { error: 'Source column not found' },
        { status: 404 }
      )
    }
    if (!toColumn) {
      return NextResponse.json(
        { error: 'Target column not found' },
        { status: 404 }
      )
    }

    // Get the last task order in the target column
    const lastOrder = await getLastTaskOrder(toColumnId)
    const startOrder = lastOrder + 1

    // Move all tasks from source to target
    await moveAllTasksToColumn(fromColumnId, toColumnId, startOrder)

    // Delete the source column
    await deleteColumn(fromColumnId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error merging columns:', error)
    return NextResponse.json(
      { error: 'Failed to merge columns' },
      { status: 500 }
    )
  }
}
