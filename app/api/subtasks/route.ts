import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        column: { board: { userId } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const lastSubtask = await prisma.subTask.findFirst({
      where: { taskId },
      orderBy: { order: 'desc' },
    })

    const subtask = await prisma.subTask.create({
      data: {
        title,
        taskId,
        order: (lastSubtask?.order ?? -1) + 1,
      },
    })

    return NextResponse.json(subtask, { status: 201 })
  } catch (error) {
    console.error('Error creating subtask:', error)
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 })
  }
}
