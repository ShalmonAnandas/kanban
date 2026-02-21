import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserId } from '@/lib/session'
import { MASKED_PAT } from '@/lib/constants'
import { backfillColumnColors } from '@/lib/backfillColumnColors'

type Params = Promise<{ boardId: string }>

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    
    let board = await prisma.board.findFirst({
      where: {
        id: boardId,
        userId,
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
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // Backfill colors for any columns that don't have one
    if (board.columns.some((c: { color: string | null }) => !c.color)) {
      await backfillColumnColors([board.id])
      board = await prisma.board.findFirst({
        where: { id: boardId, userId },
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
      if (!board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404 }
        )
      }
    }
    
    // Mask the PAT before returning to client
    return NextResponse.json({
      ...board,
      jiraPat: board.jiraPat ? MASKED_PAT : null,
    })
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json(
      { error: 'Failed to fetch board' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        userId,
      },
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    await prisma.board.delete({
      where: { id: boardId },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting board:', error)
    return NextResponse.json(
      { error: 'Failed to delete board' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { boardId } = await params
    const userId = await getUserId()
    const body = await request.json()
    
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        userId,
      },
    })
    
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }
    
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.jiraBaseUrl !== undefined && { jiraBaseUrl: body.jiraBaseUrl }),
        ...(body.jiraPat !== undefined && { jiraPat: body.jiraPat }),
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

    // Mask the PAT before returning to client - only indicate presence
    return NextResponse.json({
      ...updatedBoard,
      jiraPat: updatedBoard.jiraPat ? MASKED_PAT : null,
    })
  } catch (error) {
    console.error('Error updating board:', error)
    return NextResponse.json(
      { error: 'Failed to update board' },
      { status: 500 }
    )
  }
}
