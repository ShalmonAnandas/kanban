import prisma from '@/lib/prisma'
import { getUserIdFromCookie, SESSION_INIT_PATH } from '@/lib/session'
import { KanbanBoard, Board } from '@/components/KanbanBoard'
import { redirect } from 'next/navigation'

export default async function Home() {
  const userId = await getUserIdFromCookie()

  if (!userId) {
    redirect(`${SESSION_INIT_PATH}?redirect_to=/`)
  }
  
  // Get or create a default board for the user
  let boardData = await prisma.board.findFirst({
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
  })

  // Create default board if none exists
  if (!boardData) {
    boardData = await prisma.board.create({
      data: {
        title: 'My Kanban Board',
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
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
  }

  // Serialize dates to strings for client component
  const board: Board = {
    ...boardData,
    jiraBaseUrl: boardData.jiraBaseUrl || null,
    jiraPat: boardData.jiraPat ? '••••••••' : null,
    createdAt: boardData.createdAt.toISOString(),
    updatedAt: boardData.updatedAt.toISOString(),
    columns: boardData.columns.map(col => ({
      ...col,
      createdAt: col.createdAt.toISOString(),
      updatedAt: col.updatedAt.toISOString(),
      tasks: col.tasks.map(task => ({
        ...task,
        startDate: task.startDate ? task.startDate.toISOString() : null,
        endDate: task.endDate ? task.endDate.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    })),
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500 text-white font-bold text-lg shadow-sm">
            K
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{board.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Drag and drop tasks to organize your work
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-full mx-auto py-6">
        <KanbanBoard initialBoard={board} />
      </main>
    </div>
  )
}
