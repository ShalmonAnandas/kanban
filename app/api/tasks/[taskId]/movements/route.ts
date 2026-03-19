import { NextResponse } from 'next/server'
import { findTaskOwnedBy, findTaskMovementsByTaskId } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

type Params = Promise<{ taskId: string }>

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params
    const userId = await getUserId()

    // Verify task belongs to user
    const task = await findTaskOwnedBy(taskId, userId)
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const movements = await findTaskMovementsByTaskId(taskId)

    return NextResponse.json(
      movements.map((m) => ({
        id: m.id,
        taskId: m.task_id,
        fromColumnTitle: m.from_column_title,
        toColumnTitle: m.to_column_title,
        movedAt: m.moved_at,
      }))
    )
  } catch (error) {
    console.error('Error fetching task movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task movements' },
      { status: 500 }
    )
  }
}
