import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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
    
    // Use a single transaction for verification + reorder to minimize DB round trips
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Verify task and target column belong to user in parallel
      const [task, targetColumn] = await Promise.all([
        tx.task.findFirst({
          where: {
            id: taskId,
            column: { board: { userId } },
          },
        }),
        tx.column.findFirst({
          where: {
            id: columnId,
            board: { userId },
          },
        }),
      ])

      if (!task) throw new Error('Task not found')
      if (!targetColumn) throw new Error('Column not found')
      
      const oldColumnId = task.columnId
      const oldOrder = task.order
      
      if (oldColumnId === columnId) {
        // Moving within same column
        if (newOrder > oldOrder) {
          await tx.task.updateMany({
            where: {
              columnId,
              order: { gt: oldOrder, lte: newOrder },
            },
            data: { order: { decrement: 1 } },
          })
        } else if (newOrder < oldOrder) {
          await tx.task.updateMany({
            where: {
              columnId,
              order: { gte: newOrder, lt: oldOrder },
            },
            data: { order: { increment: 1 } },
          })
        }
      } else {
        // Moving to different column
        await Promise.all([
          tx.task.updateMany({
            where: {
              columnId: oldColumnId,
              order: { gt: oldOrder },
            },
            data: { order: { decrement: 1 } },
          }),
          tx.task.updateMany({
            where: {
              columnId,
              order: { gte: newOrder },
            },
            data: { order: { increment: 1 } },
          }),
        ])
      }
      
      // Date tracking based on column flags
      const dateUpdates: { startDate?: Date; endDate?: Date | null } = {}
      if (targetColumn.isEnd) {
        dateUpdates.endDate = new Date()
      } else if (task.endDate) {
        dateUpdates.endDate = null
      }
      if (targetColumn.isStart && !task.startDate) {
        dateUpdates.startDate = new Date()
      }

      return tx.task.update({
        where: { id: taskId },
        data: {
          columnId,
          order: newOrder,
          ...dateUpdates,
        },
      })
    })
    
    // Return only the updated task instead of the full board
    return NextResponse.json(updatedTask)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder task'
    const status = message === 'Task not found' || message === 'Column not found' ? 404 : 500
    if (status === 500) {
      console.error('[Reorder API] Error reordering task:', error)
    }
    return NextResponse.json({ error: message }, { status })
  }
}
