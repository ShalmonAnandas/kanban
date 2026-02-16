import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { title, description, columnId, priority } = await request.json()
    
    if (!title || !columnId) {
      return NextResponse.json(
        { error: 'Title and columnId are required' },
        { status: 400 }
      )
    }
    
    // Verify column belongs to user
    const column = await prisma.column.findFirst({
      where: {
        id: columnId,
        board: {
          userId,
        },
      },
      include: {
        board: true,
      },
    })
    
    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }
    
    // Handle #jira prefix for bulk ticket creation
    if (title.startsWith('#jira ')) {
      const jiraBaseUrl = column.board.jiraBaseUrl
      if (!jiraBaseUrl) {
        return NextResponse.json(
          { error: 'Board does not have a jiraBaseUrl configured' },
          { status: 400 }
        )
      }

      const numbers = title.slice(6).split(',').map((n: string) => n.trim()).filter(Boolean)
      if (numbers.length === 0) {
        return NextResponse.json(
          { error: 'No ticket numbers provided' },
          { status: 400 }
        )
      }

      const lastTask = await prisma.task.findFirst({
        where: { columnId },
        orderBy: { order: 'desc' },
      })
      let nextOrder = (lastTask?.order ?? -1) + 1

      const tasks = []
      for (const num of numbers) {
        const taskTitle = `[TICKET-${num}](${jiraBaseUrl}${num})`
        const task = await prisma.task.create({
          data: {
            title: taskTitle,
            description: description || null,
            columnId,
            priority: priority || 'medium',
            order: nextOrder++,
            ...(column.isStart && { startDate: new Date() }),
          },
        })
        tasks.push(task)
      }

      return NextResponse.json(tasks, { status: 201 })
    }
    
    // Get the next order number
    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
    })
    
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        columnId,
        priority: priority || 'medium',
        order: (lastTask?.order ?? -1) + 1,
        ...(column.isStart && { startDate: new Date() }),
      },
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
