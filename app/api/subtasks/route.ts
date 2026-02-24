import { NextResponse } from 'next/server'
import { findTaskOwnedBy, getLastSubtaskOrder, createSubtask as dbCreateSubtask } from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { taskId, title } = await request.json()

    if (!taskId || !title) {
      return NextResponse.json(
        { error: 'taskId and title are required' },
        { status: 400 }
      )
    }

    // Verify task belongs to user
    const task = await findTaskOwnedBy(taskId, userId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const lastOrder = await getLastSubtaskOrder(taskId)

    const subtask = await dbCreateSubtask({
      title,
      taskId,
      order: lastOrder + 1,
    })

    // Map to camelCase
    return NextResponse.json({
      id: subtask.id,
      title: subtask.title,
      done: subtask.done,
      order: subtask.order,
      taskId: subtask.task_id,
      createdAt: subtask.created_at,
      updatedAt: subtask.updated_at,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating subtask:', error)
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 })
  }
}
