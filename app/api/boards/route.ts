import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/session'
import { backfillColumnColors } from '@/lib/backfillColumnColors'

export async function GET() {
  try {
    const userId = await getUserId()
    
    let boards = await prisma.board.findMany({
      where: { userId },
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
      orderBy: { createdAt: 'desc' },
    })

    // Backfill colors for any columns that don't have one
    const boardsWithMissing = boards.filter((b: { id: string; columns: { color: string | null }[] }) =>
      b.columns.some((c) => !c.color)
    )
    if (boardsWithMissing.length > 0) {
      await backfillColumnColors(boardsWithMissing.map((b: { id: string }) => b.id))
      boards = await prisma.board.findMany({
        where: { userId },
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
        orderBy: { createdAt: 'desc' },
      })
    }
    
    return NextResponse.json(boards)
  } catch (error) {
    console.error('Error fetching boards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    const { title } = await request.json()
    
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }
    
    const board = await prisma.board.create({
      data: {
        title,
        userId,
        columns: {
          create: [
            { title: 'To Do', order: 0, isStart: true },
            { title: 'In Progress', order: 1 },
            { title: 'Done', order: 2, isEnd: true },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: true,
          },
        },
      },
    })
    
    return NextResponse.json(board, { status: 201 })
  } catch (error) {
    console.error('Error creating board:', error)
    return NextResponse.json(
      { error: 'Failed to create board' },
      { status: 500 }
    )
  }
}
