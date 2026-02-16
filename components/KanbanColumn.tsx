'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { Spinner } from './Spinner'
import { Column, Task } from './KanbanBoard'

type KanbanColumnProps = {
  column: Column
  onCreateTask: (columnId: string, title: string, priority: string) => Promise<void>
  onDeleteTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onUpdateColumn: (columnId: string, data: Partial<Column>) => void
  onDeleteColumn: (columnId: string) => void
}

export function KanbanColumn({
  column,
  onCreateTask,
  onDeleteTask,
  onEditTask,
  onUpdateColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')
  const [creatingTask, setCreatingTask] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
        setConfirmDelete(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      setCreatingTask(true)
      try {
        await onCreateTask(column.id, newTaskTitle.trim(), newTaskPriority)
        setNewTaskTitle('')
        setNewTaskPriority('medium')
        setIsAddingTask(false)
      } finally {
        setCreatingTask(false)
      }
    }
  }

  const handleRename = () => {
    if (renameValue.trim() && renameValue.trim() !== column.title) {
      onUpdateColumn(column.id, { title: renameValue.trim() })
    }
    setIsRenaming(false)
    setShowMenu(false)
  }

  const handleToggleStart = () => {
    onUpdateColumn(column.id, { isStart: !column.isStart })
    setShowMenu(false)
  }

  const handleToggleEnd = () => {
    onUpdateColumn(column.id, { isEnd: !column.isEnd })
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDeleteColumn(column.id)
    setShowMenu(false)
    setConfirmDelete(false)
  }

  return (
    <div className="flex flex-col w-80 bg-gray-50 rounded-2xl p-4 shrink-0 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenameValue(column.title); setIsRenaming(false) } }}
              className="text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-400 w-full"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-gray-700 text-sm truncate">
              {column.title}
            </h3>
          )}
          {column.isStart && (
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap ring-1 ring-emerald-200" title="Start column" aria-label="Start column">Start</span>
          )}
          {column.isEnd && (
            <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap ring-1 ring-red-200" title="End column" aria-label="End column">End</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
            {column.tasks.length}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-white"
              aria-label="Column settings"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 text-sm">
                <button
                  onClick={() => { setIsRenaming(true); setShowMenu(false); setRenameValue(column.title) }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={handleToggleStart}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  {column.isStart ? '🟢 Unset Start' : '🟢 Set as Start'}
                </button>
                <button
                  onClick={handleToggleEnd}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  {column.isEnd ? '🔴 Unset End' : '🔴 Set as End'}
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleDelete}
                  className={`w-full text-left px-3 py-2 transition-colors ${confirmDelete ? 'bg-red-50 text-red-700 font-semibold' : 'hover:bg-red-50 text-red-600'}`}
                  aria-label={confirmDelete ? 'Press again to confirm deletion' : 'Delete column'}
                >
                  {confirmDelete ? '⚠️ Confirm Delete?' : '🗑️ Delete Column'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex flex-col gap-2 min-h-[200px] flex-1"
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={onEditTask}
            />
          ))}
        </div>
      </SortableContext>

      {isAddingTask ? (
        <form onSubmit={handleSubmit} className="mt-3 relative">
          {creatingTask && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80 rounded-xl">
              <Spinner size="sm" className="text-violet-500" />
            </div>
          )}
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-gray-800 text-sm"
            autoFocus
            disabled={creatingTask}
            onBlur={() => {
              if (!newTaskTitle.trim() && !creatingTask) {
                setIsAddingTask(false)
              }
            }}
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            disabled={creatingTask}
            className="w-full mt-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🔵 Medium</option>
            <option value="low">🟢 Low</option>
            <option value="nice_to_have">⚪ Nice to have</option>
          </select>
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={creatingTask}
              className="px-3 py-1.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 text-sm transition-colors disabled:opacity-50 font-medium"
            >
              {creatingTask ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              disabled={creatingTask}
              onClick={() => {
                setIsAddingTask(false)
                setNewTaskTitle('')
                setNewTaskPriority('medium')
              }}
              className="px-3 py-1.5 bg-white text-gray-600 rounded-xl hover:bg-gray-100 text-sm transition-colors border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAddingTask(true)}
          className="mt-3 w-full px-3 py-2 text-left text-gray-400 hover:bg-white hover:text-gray-600 rounded-xl transition-colors text-sm font-medium border border-dashed border-gray-200 hover:border-gray-300"
        >
          + Add task
        </button>
      )}
    </div>
  )
}
