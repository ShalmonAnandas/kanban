'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import {
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { Spinner } from './Spinner'
import { fetchJiraIssueClientSide } from '@/lib/jira-client'

export type Task = {
  id: string
  title: string
  description: string | null
  priority: string
  order: number
  columnId: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

export type Column = {
  id: string
  title: string
  order: number
  isStart: boolean
  isEnd: boolean
  boardId: string
  tasks: Task[]
  createdAt: string
  updatedAt: string
}

export type Board = {
  id: string
  title: string
  userId: string
  jiraBaseUrl: string | null
  jiraPat: string | null
  columns: Column[]
  createdAt: string
  updatedAt: string
}

type KanbanBoardProps = {
  initialBoard: Board
}

// Normalize date fields from API responses to ISO strings.
function serializeBoardDates(raw: Board): Board {
  return {
    ...raw,
    columns: raw.columns.map((col) => ({
      ...col,
      tasks: col.tasks.map((t) => ({
        ...t,
        startDate: t.startDate ? String(t.startDate) : null,
        endDate: t.endDate ? String(t.endDate) : null,
        createdAt: String(t.createdAt),
        updatedAt: String(t.updatedAt),
      })),
    })),
  }
}

export function KanbanBoard({ initialBoard }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board>(initialBoard)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  // Board settings
  const [showBoardSettings, setShowBoardSettings] = useState(false)
  const [jiraUrlInput, setJiraUrlInput] = useState(initialBoard.jiraBaseUrl || '')
  const [jiraPatInput, setJiraPatInput] = useState('')
  const [savingJira, setSavingJira] = useState(false)

  // Add column
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [newColIsStart, setNewColIsStart] = useState(false)
  const [newColIsEnd, setNewColIsEnd] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [savingTask, setSavingTask] = useState(false)

  // Global loading for reorder
  const [reordering, setReordering] = useState(false)

  // Track the board state at drag start for reliable backend persistence
  const dragStartBoardRef = useRef<Board | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    setBoard(initialBoard)
  }, [initialBoard])

  // Helper: find which column contains a given task or is the column itself
  const findColumnOfItem = useCallback((id: UniqueIdentifier, columns: Column[]): Column | undefined => {
    const col = columns.find((c) => c.id === id)
    if (col) return col
    return columns.find((c) => c.tasks.some((t) => t.id === id))
  }, [])

  // Helper: resolve the actual column ID from a task or column ID
  const resolveColumnId = useCallback((id: UniqueIdentifier, columns: Column[]): string | undefined => {
    const col = findColumnOfItem(id, columns)
    if (!col) return undefined
    return col.id === id ? (id as string) : col.id
  }, [findColumnOfItem])

  // Helper: get a task's current column ID and order index
  const getTaskPosition = useCallback((taskId: string, columns: Column[]): { columnId: string; order: number } | undefined => {
    for (const col of columns) {
      const idx = col.tasks.findIndex((t) => t.id === taskId)
      if (idx !== -1) return { columnId: col.id, order: idx }
    }
    return undefined
  }, [])

  // Open task detail modal
  const openTaskModal = (task: Task) => {
    setSelectedTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setEditPriority(task.priority)
  }

  const closeTaskModal = () => {
    setSelectedTask(null)
  }

  const handleSaveTask = async () => {
    if (!selectedTask) return
    setSavingTask(true)
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
          priority: editPriority,
        }),
      })
      if (response.ok) {
        const updatedTask: Task = await response.json()
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            tasks: col.tasks.map((t) =>
              t.id === updatedTask.id
                ? {
                    ...updatedTask,
                    startDate: updatedTask.startDate ? String(updatedTask.startDate) : null,
                    endDate: updatedTask.endDate ? String(updatedTask.endDate) : null,
                    createdAt: String(updatedTask.createdAt),
                    updatedAt: String(updatedTask.updatedAt),
                  }
                : t
            ),
          })),
        }))
        setSelectedTask(null)
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setSavingTask(false)
    }
  }

  const handleSaveJiraSettings = async () => {
    setSavingJira(true)
    try {
      const body: Record<string, string | null> = { jiraBaseUrl: jiraUrlInput || null }
      if (jiraPatInput) {
        body.jiraPat = jiraPatInput
      }
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (response.ok) {
        const updated = await response.json()
        setBoard((prev) => ({
          ...prev,
          jiraBaseUrl: updated.jiraBaseUrl ?? null,
          jiraPat: updated.jiraPat ?? null,
        }))
        setJiraPatInput('')
        setShowBoardSettings(false)
      }
    } catch (error) {
      console.error('Failed to save board settings:', error)
    } finally {
      setSavingJira(false)
    }
  }

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColTitle.trim()) return
    setAddingColumn(true)
    try {
      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          title: newColTitle.trim(),
          isStart: newColIsStart,
          isEnd: newColIsEnd,
        }),
      })
      if (response.ok) {
        const newCol = await response.json()
        const column: Column = {
          ...newCol,
          tasks: [],
          createdAt: String(newCol.createdAt),
          updatedAt: String(newCol.updatedAt),
        }
        setBoard((prev) => ({ ...prev, columns: [...prev.columns, column] }))
        setNewColTitle('')
        setNewColIsStart(false)
        setNewColIsEnd(false)
        setShowAddColumn(false)
      }
    } catch (error) {
      console.error('Failed to add column:', error)
    } finally {
      setAddingColumn(false)
    }
  }

  const handleUpdateColumn = async (columnId: string, data: Partial<Column>) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        const updated = await response.json()
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, ...updated, tasks: col.tasks, createdAt: String(updated.createdAt), updatedAt: String(updated.updatedAt) }
              : col
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setBoard((prev) => ({
          ...prev,
          columns: prev.columns.filter((col) => col.id !== columnId),
        }))
      }
    } catch (error) {
      console.error('Failed to delete column:', error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = board.columns
      .flatMap((col) => col.tasks)
      .find((t) => t.id === active.id)
    setActiveTask(task || null)
    dragStartBoardRef.current = board
    const col = board.columns.find((c) => c.tasks.some((t) => t.id === active.id))
    setActiveColumnId(col?.id || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    setBoard((prevBoard) => {
      const activeColId = resolveColumnId(activeId, prevBoard.columns)
      const overColId = resolveColumnId(overId, prevBoard.columns)

      if (!activeColId || !overColId) return prevBoard

      // Only handle cross-column moves in onDragOver
      if (activeColId === overColId) return prevBoard

      const activeColIndex = prevBoard.columns.findIndex((c) => c.id === activeColId)
      const overColIndex = prevBoard.columns.findIndex((c) => c.id === overColId)
      if (activeColIndex === -1 || overColIndex === -1) return prevBoard

      const activeTaskIndex = prevBoard.columns[activeColIndex].tasks.findIndex(
        (t) => t.id === activeId
      )
      if (activeTaskIndex === -1) return prevBoard

      const task = prevBoard.columns[activeColIndex].tasks[activeTaskIndex]

      // Determine insert position
      let newIndex = prevBoard.columns[overColIndex].tasks.length
      const overTaskIndex = prevBoard.columns[overColIndex].tasks.findIndex((t) => t.id === overId)
      if (overTaskIndex !== -1) {
        newIndex = overTaskIndex
      }

      const newColumns = prevBoard.columns.map((col, idx) => {
        if (idx === activeColIndex) {
          return {
            ...col,
            tasks: col.tasks
              .filter((t) => t.id !== activeId)
              .map((t, i) => ({ ...t, order: i })),
          }
        }
        if (idx === overColIndex) {
          const updatedTasks = [...col.tasks]
          updatedTasks.splice(newIndex, 0, { ...task, columnId: col.id })
          return {
            ...col,
            tasks: updatedTasks.map((t, i) => ({ ...t, order: i })),
          }
        }
        return col
      })

      return { ...prevBoard, columns: newColumns }
    })

    // Update visual column highlight
    const overColId = resolveColumnId(overId, board.columns)
    if (overColId) {
      setActiveColumnId(overColId)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    setActiveColumnId(null)

    if (!over) {
      // Dropped outside - revert
      if (dragStartBoardRef.current) {
        setBoard(dragStartBoardRef.current)
      }
      dragStartBoardRef.current = null
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Compute final position synchronously (do not rely on setState callback side effects)
    const activeColId = resolveColumnId(activeId, board.columns)
    const overColId = resolveColumnId(overId, board.columns)

    let finalPosition: { columnId: string; order: number } | undefined
    let shouldPersist = false

    if (activeColId && overColId) {
      const activeCol = board.columns.find((c) => c.id === activeColId)
      const overCol = board.columns.find((c) => c.id === overColId)

      if (activeCol && overCol) {
        const oldIndex = activeCol.tasks.findIndex((t) => t.id === activeId)
        let newIndex = overCol.tasks.findIndex((t) => t.id === overId)
        if (newIndex === -1) {
          newIndex = overCol.tasks.length
        }

        if (oldIndex !== -1) {
          const movingTask = activeCol.tasks[oldIndex]
          let nextBoard = board

          if (activeColId === overColId) {
            if (oldIndex !== newIndex) {
              nextBoard = {
                ...board,
                columns: board.columns.map((c) => {
                  if (c.id !== activeColId) return c
                  const reordered = arrayMove(c.tasks, oldIndex, newIndex)
                  return { ...c, tasks: reordered.map((t, i) => ({ ...t, order: i })) }
                }),
              }
            }
          } else {
            nextBoard = {
              ...board,
              columns: board.columns.map((c) => {
                if (c.id === activeColId) {
                  const remaining = c.tasks.filter((t) => t.id !== activeId)
                  return { ...c, tasks: remaining.map((t, i) => ({ ...t, order: i })) }
                }
                if (c.id === overColId) {
                  const inserted = [...c.tasks]
                  inserted.splice(newIndex, 0, { ...movingTask, columnId: overColId })
                  return { ...c, tasks: inserted.map((t, i) => ({ ...t, order: i })) }
                }
                return c
              }),
            }
          }

          finalPosition = getTaskPosition(activeId, nextBoard.columns)
          shouldPersist = !!finalPosition
          if (nextBoard !== board) {
            setBoard(nextBoard)
          }
        }
      }
    }

    if (!finalPosition || !shouldPersist) {
      dragStartBoardRef.current = null
      return
    }

    // Check if anything actually changed vs drag start
    const startBoard = dragStartBoardRef.current
    if (startBoard) {
      const startPos = getTaskPosition(activeId, startBoard.columns)
      if (startPos && startPos.columnId === finalPosition.columnId && startPos.order === finalPosition.order) {
        dragStartBoardRef.current = null
        return
      }
    }

    // Persist to backend
    setReordering(true)
    try {
      console.log('[DragEnd] Persisting to backend:', {
        taskId: activeId,
        columnId: finalPosition.columnId,
        newOrder: finalPosition.order,
      })

      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: activeId,
          columnId: finalPosition.columnId,
          newOrder: finalPosition.order,
        }),
      })

      if (response.ok) {
        const updatedBoard = await response.json()
        console.log('[DragEnd] Successfully persisted to backend')
        setBoard(serializeBoardDates(updatedBoard))
      } else {
        const errorData = await response.text()
        console.error('[DragEnd] Backend returned error:', response.status, errorData)
        if (dragStartBoardRef.current) {
          setBoard(dragStartBoardRef.current)
        }
      }
    } catch (error) {
      console.error('[DragEnd] Failed to reorder task:', error)
      if (dragStartBoardRef.current) {
        setBoard(dragStartBoardRef.current)
      }
    } finally {
      setReordering(false)
      dragStartBoardRef.current = null
    }
  }

  const handleCreateTask = async (columnId: string, title: string, priority: string) => {
    // Handle #jira prefix for bulk ticket creation (client-side)
    if (title.startsWith('#jira ')) {
      const jiraBaseUrl = board.jiraBaseUrl
      if (!jiraBaseUrl) {
        console.error('Board does not have a JIRA Base URL configured')
        return
      }

      const numbers = title.slice(6).split(',').map((n: string) => n.trim()).filter(Boolean)
      if (numbers.length === 0) {
        console.error('No ticket numbers provided after #jira prefix')
        return
      }

      // Validate ticket numbers
      const validTicket = /^[a-zA-Z0-9-]+$/
      const invalidTickets = numbers.filter(num => !validTicket.test(num))
      if (invalidTickets.length > 0) {
        console.error('Invalid ticket numbers:', invalidTickets.join(', '))
        return
      }

      // Ensure jiraBaseUrl ends with a separator
      const baseUrl = jiraBaseUrl.endsWith('/') || jiraBaseUrl.endsWith('-') ? jiraBaseUrl : jiraBaseUrl + '/'
      const jiraPat = board.jiraPat

      // Fetch JIRA issues client-side (in parallel)
      const issuePromises = numbers.map(async (num) => {
        let taskTitle = `[TICKET-${num}](${baseUrl}${num})`
        let taskDescription = null

        // If PAT is configured, fetch issue details from JIRA client-side
        if (jiraPat) {
          const issueData = await fetchJiraIssueClientSide(jiraBaseUrl, jiraPat, num)
          if (issueData) {
            taskTitle = `[${issueData.summary}](${baseUrl}${num})`
            taskDescription = issueData.description
          }
        }

        return { title: taskTitle, description: taskDescription, ticketNum: num }
      })

      const issueDetails = await Promise.all(issuePromises)

      // Create tasks via API (in parallel)
      const taskPromises = issueDetails.map(details =>
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: details.title,
            description: details.description,
            columnId,
            priority: priority || 'medium',
          }),
        }).then(async (response) => {
          if (response.ok) {
            return { success: true, task: await response.json(), ticketNum: details.ticketNum }
          } else {
            console.error(`Failed to create task for ticket ${details.ticketNum}:`, response.status)
            return { success: false, ticketNum: details.ticketNum }
          }
        }).catch((error) => {
          console.error(`Error creating task for ticket ${details.ticketNum}:`, error)
          return { success: false, ticketNum: details.ticketNum }
        })
      )

      const results = await Promise.all(taskPromises)
      const createdTasks = results.filter((r): r is { success: true; task: Task; ticketNum: string } => r.success).map(r => r.task)
      const failedTickets = results.filter(r => !r.success).map(r => r.ticketNum)

      if (failedTickets.length > 0) {
        console.error('Failed to create tasks for tickets:', failedTickets.join(', '))
      }

      // Update board state with new tasks
      if (createdTasks.length > 0) {
        setBoard((prevBoard) => {
          const newColumns = prevBoard.columns.map((col) => {
            if (col.id === columnId) {
              const serialized = createdTasks.map((t: Task) => ({
                ...t,
                startDate: t.startDate ? String(t.startDate) : null,
                endDate: t.endDate ? String(t.endDate) : null,
                createdAt: String(t.createdAt),
                updatedAt: String(t.updatedAt),
              }))
              return { ...col, tasks: [...col.tasks, ...serialized] }
            }
            return col
          })
          return { ...prevBoard, columns: newColumns }
        })
      }
      return
    }

    // Regular task creation
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, columnId, priority }),
    })

    if (response.ok) {
      const result = await response.json()
      const newTasks: Task[] = Array.isArray(result) ? result : [result]
      setBoard((prevBoard) => {
        const newColumns = prevBoard.columns.map((col) => {
          if (col.id === columnId) {
            const serialized = newTasks.map((t: Task) => ({
              ...t,
              startDate: t.startDate ? String(t.startDate) : null,
              endDate: t.endDate ? String(t.endDate) : null,
              createdAt: String(t.createdAt),
              updatedAt: String(t.updatedAt),
            }))
            return { ...col, tasks: [...col.tasks, ...serialized] }
          }
          return col
        })
        return { ...prevBoard, columns: newColumns }
      })
    } else {
      console.error('Failed to create task:', response.status)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (response.ok) {
        setBoard((prevBoard) => ({
          ...prevBoard,
          columns: prevBoard.columns.map((col) => ({
            ...col,
            tasks: col.tasks.filter((task) => task.id !== taskId),
          })),
        }))
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const formatDateDisplay = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const hasJiraPat = !!board.jiraPat

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center gap-2 px-6 mb-4">
        <button
          onClick={() => { setShowBoardSettings((v) => !v); setJiraUrlInput(board.jiraBaseUrl || ''); setJiraPatInput('') }}
          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500 font-medium inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
        {hasJiraPat && (
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">✓ JIRA</span>
        )}
      </div>

      {/* Board settings panel */}
      {showBoardSettings && (
        <div className="mx-6 mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wider">Board Settings</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">JIRA Base URL</label>
              <input
                type="text"
                value={jiraUrlInput}
                onChange={(e) => setJiraUrlInput(e.target.value)}
                placeholder="https://yourorg.atlassian.net/browse/"
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">JIRA PAT</label>
              <input
                type="password"
                value={jiraPatInput}
                onChange={(e) => setJiraPatInput(e.target.value)}
                placeholder={hasJiraPat ? '••••••••  (configured)' : 'Enter PAT…'}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveJiraSettings}
                disabled={savingJira}
                className="px-3 py-1.5 bg-violet-500 text-white rounded-lg hover:bg-violet-600 text-xs transition-colors disabled:opacity-50 font-medium inline-flex items-center gap-1.5"
              >
                {savingJira && <Spinner size="sm" className="text-white" />}
                {savingJira ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowBoardSettings(false)}
                className="px-3 py-1.5 text-gray-500 rounded-lg hover:bg-gray-50 text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reorder loading indicator */}
      {reordering && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-lg">
          <Spinner size="sm" className="text-violet-500" />
          <span className="text-xs text-gray-600 font-medium">Saving…</span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 px-6 items-start">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={openTaskModal}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              isOver={activeColumnId === column.id}
            />
          ))}

          {/* Add column */}
          <div className="shrink-0 w-72">
            {showAddColumn ? (
              <form onSubmit={handleAddColumn} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm relative">
                {addingColumn && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-xl">
                    <Spinner size="md" className="text-violet-500" />
                  </div>
                )}
                <h4 className="text-xs font-bold text-gray-800 mb-2 uppercase tracking-wider">New Column</h4>
                <input
                  type="text"
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  placeholder="Column title…"
                  disabled={addingColumn}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent mb-2"
                  autoFocus
                />
                <div className="flex items-center gap-3 mb-2 text-[10px] text-gray-600">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newColIsStart}
                      onChange={(e) => setNewColIsStart(e.target.checked)}
                      className="rounded border-gray-300 text-violet-500 focus:ring-violet-400"
                    />
                    Start
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newColIsEnd}
                      onChange={(e) => setNewColIsEnd(e.target.checked)}
                      className="rounded border-gray-300 text-violet-500 focus:ring-violet-400"
                    />
                    End
                  </label>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    disabled={addingColumn}
                    className="px-2.5 py-1 bg-violet-500 text-white rounded-lg hover:bg-violet-600 text-xs transition-colors font-medium disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    disabled={addingColumn}
                    onClick={() => { setShowAddColumn(false); setNewColTitle(''); setNewColIsStart(false); setNewColIsEnd(false) }}
                    className="px-2.5 py-1 text-gray-500 rounded-lg hover:bg-gray-50 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddColumn(true)}
                className="w-full py-2.5 bg-white/50 border border-dashed border-gray-300 rounded-xl text-gray-400 hover:bg-white hover:text-gray-600 hover:border-gray-400 transition-all text-xs font-medium"
              >
                + Add Column
              </button>
            )}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCard task={activeTask} isDragging isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onClick={closeTaskModal}>
          <div
            className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-md mx-4 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="task-modal-title" className="text-sm font-bold text-gray-900 mb-4">Edit Task</h2>

            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent mb-3"
            />

            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent mb-3 resize-y font-mono"
              placeholder="Add a description…"
            />

            <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Priority</label>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent mb-3"
            >
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">🟢 Low</option>
              <option value="nice_to_have">⚪ Nice to have</option>
            </select>

            {(selectedTask.startDate || selectedTask.endDate) && (
              <div className="flex gap-3 mb-3 text-[10px] text-gray-500">
                {selectedTask.startDate && (
                  <div className="bg-gray-50 px-2 py-1 rounded-md">
                    <span className="font-semibold">Start:</span> {formatDateDisplay(selectedTask.startDate)}
                  </div>
                )}
                {selectedTask.endDate && (
                  <div className="bg-gray-50 px-2 py-1 rounded-md">
                    <span className="font-semibold">End:</span> {formatDateDisplay(selectedTask.endDate)}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={closeTaskModal}
                className="px-3 py-1.5 text-gray-500 rounded-lg hover:bg-gray-50 text-xs transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={savingTask}
                className="px-3 py-1.5 bg-violet-500 text-white rounded-lg hover:bg-violet-600 text-xs transition-colors disabled:opacity-50 font-medium inline-flex items-center gap-1.5"
              >
                {savingTask && <Spinner size="sm" className="text-white" />}
                {savingTask ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
