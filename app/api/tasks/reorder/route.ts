import { NextResponse } from 'next/server'
import {
  findTaskOwnedBy,
  findColumnOwnedBy,
  decrementTaskOrders,
  incrementTaskOrders,
  decrementTaskOrdersAbove,
  incrementTaskOrdersAbove,
  moveTask,
} from '@/lib/db-queries'
import { getUserId } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { taskId, columnId, newOrder } = await request.json()
    
    if (!taskId || !columnId || newOrder === undefined) {
      return NextResponse.json(
        { error: 'taskId, columnId, and newOrder are required' },
        { status: 400 }
      )
    }
    
    // Verify task and target column belong to user
    const [task, targetColumn] = await Promise.all([
      findTaskOwnedBy(taskId, userId),
      findColumnOwnedBy(columnId, userId),
    ])

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (!targetColumn) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }
    
    const oldColumnId = task.column_id
    const oldOrder = task.order
    
    if (oldColumnId === columnId) {
      // Moving within same column
      if (newOrder > oldOrder) {
        await decrementTaskOrders(columnId, oldOrder, newOrder)
      } else if (newOrder < oldOrder) {
        await incrementTaskOrders(columnId, newOrder, oldOrder)
      }
    } else {
      // Moving to different column
      await Promise.all([
        decrementTaskOrdersAbove(oldColumnId, oldOrder),
        incrementTaskOrdersAbove(columnId, newOrder),
      ])
    }
    
    // Date tracking based on column flags
    const dateUpdates: { startDate?: Date; endDate?: Date | null } = {}
    if (targetColumn.is_end) {
      dateUpdates.endDate = new Date()
    } else if (task.end_date) {
      dateUpdates.endDate = null
    }
    if (targetColumn.is_start && !task.start_date) {
      dateUpdates.startDate = new Date()
    }

    const updatedTask = await moveTask(taskId, columnId, newOrder, dateUpdates)
    
    // Return camelCase for client
    return NextResponse.json({
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      priority: updatedTask.priority,
      order: updatedTask.order,
      pinned: updatedTask.pinned,
      columnId: updatedTask.column_id,
      startDate: updatedTask.start_date,
      endDate: updatedTask.end_date,
      images: updatedTask.images,
      createdAt: updatedTask.created_at,
      updatedAt: updatedTask.updated_at,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder task'
    console.error('[Reorder API] Error reordering task:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
