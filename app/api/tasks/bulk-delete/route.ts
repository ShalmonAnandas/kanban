import { NextResponse } from 'next/server'
import { findTasksOwnedByIds, deleteTasksByIds } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { taskIds } = await request.json()

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: 'taskIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify all tasks belong to user in a single query
    const ownedTasks = await findTasksOwnedByIds(taskIds, userId)
    if (ownedTasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: 'One or more tasks not found or not owned by user' },
        { status: 404 }
      )
    }

    await deleteTasksByIds(taskIds)

    return NextResponse.json({ success: true, deleted: taskIds.length })
  } catch (error) {
    console.error('Error bulk deleting tasks:', error)
    return NextResponse.json(
      { error: 'Failed to bulk delete tasks' },
      { status: 500 }
    )
  }
}
