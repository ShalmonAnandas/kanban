import { Suspense } from 'react'
import { findBoardFirstByUserId, createBoard } from '@/lib/db-queries'
import { getUserIdFromCookie, SESSION_INIT_PATH } from '@/lib/session'
import { MASKED_PAT } from '@/lib/constants'
import { KanbanBoard, Board } from '@/components/KanbanBoard'
import { redirect } from 'next/navigation'
import { PASTEL_COLORS } from '@/lib/colors'

export const dynamic = 'force-dynamic'

function BoardSkeleton() {
  return (
    <>
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white font-bold text-sm shadow-sm">
            K
          </div>
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-2.5 w-56 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-1" />
          </div>
        </div>
      </header>
      <main className="max-w-full mx-auto py-4">
        <div className="flex gap-4 px-6 overflow-x-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 bg-white/60 dark:bg-gray-900/60 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-4"
            >
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              {[0, 1].map((j) => (
                <div
                  key={j}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 mb-2"
                >
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </>
  )
}

async function BoardContent() {
  const userId = await getUserIdFromCookie()

  if (!userId) {
    redirect(`${SESSION_INIT_PATH}?redirect_to=/`)
  }
  
  // Get or create a default board for the user
  let boardData = await findBoardFirstByUserId(userId)

  // Create default board if none exists
  if (!boardData) {
    boardData = await createBoard('My Kanban Board', userId, [
      { title: 'To Do', order: 0, isStart: true, color: PASTEL_COLORS[0] },
      { title: 'In Progress', order: 1, color: PASTEL_COLORS[4] },
      { title: 'Done', order: 2, isEnd: true, color: PASTEL_COLORS[3] },
    ])
  }

  // Serialize dates to strings for client component
  const board: Board = {
    id: boardData.id,
    title: boardData.title,
    subtitle: boardData.subtitle || null,
    userId: boardData.user_id,
    jiraBaseUrl: boardData.jira_base_url || null,
    jiraPat: boardData.jira_pat ? MASKED_PAT : null,
    createdAt: boardData.created_at,
    updatedAt: boardData.updated_at,
    columns: boardData.columns.map((col: typeof boardData.columns[number]) => ({
      id: col.id,
      title: col.title,
      order: col.order,
      color: col.color,
      isStart: col.is_start,
      isEnd: col.is_end,
      boardId: col.board_id,
      createdAt: col.created_at,
      updatedAt: col.updated_at,
      tasks: col.tasks.map((task: typeof col.tasks[number]) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        order: task.order,
        pinned: task.pinned ?? false,
        columnId: task.column_id,
        startDate: task.start_date || null,
        endDate: task.end_date || null,
        images: task.images || [],
        videos: task.videos || [],
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        subtasks: (task.subtasks || []).map((st: typeof task.subtasks[number]) => ({
          id: st.id,
          title: st.title,
          done: st.done,
          order: st.order,
          taskId: st.task_id,
          createdAt: st.created_at,
          updatedAt: st.updated_at,
        })),
      })),
    })),
  }

  const displayTitle = board.title || 'My Kanban Board'
  const displaySubtitle = board.subtitle || 'Drag tasks between columns to organize your work'

  return (
    <>
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white font-bold text-sm shadow-sm">
            K
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">{displayTitle}</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {displaySubtitle}
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-full mx-auto py-4">
        <KanbanBoard initialBoard={board} userId={userId} />
      </main>
    </>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950">
      <Suspense fallback={<BoardSkeleton />}>
        <BoardContent />
      </Suspense>
    </div>
  )
}
