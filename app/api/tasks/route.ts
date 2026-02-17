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
    
    // Handle #jira prefix for bulk ticket creation
    // Note: JIRA fetching is now done client-side to support Zscaler
    if (title.startsWith('#jira ')) {
      return NextResponse.json(
        { error: 'JIRA integration is handled client-side. This endpoint should not receive #jira prefixed titles.' },
        { status: 400 }
      )
    }
    
    // Verify column belongs to user and get last task order in parallel
    const [column, lastTask] = await Promise.all([
      prisma.column.findFirst({
        where: {
          id: columnId,
          board: { userId },
        },
      }),
      prisma.task.findFirst({
        where: { columnId },
        orderBy: { order: 'desc' },
      }),
    ])
    
    if (!column) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }
    
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
