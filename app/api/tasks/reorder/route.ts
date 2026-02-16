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
    
    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        column: {
          board: {
            userId,
          },
        },
      },
    })
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Verify target column belongs to user
    const targetColumn = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          userId,
        },
      },
    })
    
    if (!targetColumn) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }
    
    const oldColumnId = task.columnId
    const oldOrder = task.order
    
    // Use a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      if (oldColumnId === columnId) {
        // Moving within same column
        if (newOrder > oldOrder) {
          // Moving down: decrease order of items between old and new position
          await tx.task.updateMany({
            where: {
              columnId,
              order: {
                gt: oldOrder,
                lte: newOrder,
              },
            },
            data: {
              order: {
                decrement: 1,
              },
            },
          })
        } else if (newOrder < oldOrder) {
          // Moving up: increase order of items between new and old position
          await tx.task.updateMany({
            where: {
              columnId,
              order: {
                gte: newOrder,
                lt: oldOrder,
              },
            },
            data: {
              order: {
                increment: 1,
              },
            },
          })
        }
      } else {
        // Moving to different column
        // Decrease order of items after old position in old column
        await tx.task.updateMany({
          where: {
            columnId: oldColumnId,
            order: {
              gt: oldOrder,
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        })
        
        // Increase order of items at or after new position in new column
        await tx.task.updateMany({
          where: {
            columnId,
            order: {
              gte: newOrder,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        })
      }
      
      // Update the task with date tracking based on column flags.
      // startDate is preserved permanently once set (records when work began).
      // endDate is set/cleared dynamically based on current column (tracks completion state).
      const dateUpdates: { startDate?: Date; endDate?: Date | null } = {}
      if (targetColumn.isEnd) {
        dateUpdates.endDate = new Date()
      } else if (task.endDate) {
        dateUpdates.endDate = null
      }
      if (targetColumn.isStart && !task.startDate) {
        dateUpdates.startDate = new Date()
      }

      await tx.task.update({
        where: { id: taskId },
        data: {
          columnId,
          order: newOrder,
          ...dateUpdates,
        },
      })
    })
    
    // Fetch the updated board state
    const board = await prisma.board.findFirst({
      where: {
        columns: {
          some: {
            id: columnId,
          },
        },
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
    
    return NextResponse.json(board)
  } catch (error) {
    console.error('Error reordering task:', error)
    return NextResponse.json(
      { error: 'Failed to reorder task' },
      { status: 500 }
    )
  }
}
