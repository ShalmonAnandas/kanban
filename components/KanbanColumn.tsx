'use client'

import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { Column, Task } from './KanbanBoard'

type KanbanColumnProps = {
  column: Column
  onAddTask: (columnId: string) => void
  onDeleteTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onViewTask: (task: Task) => void
  onUpdateColumn: (columnId: string, data: Partial<Column>) => void
  onDeleteColumn: (columnId: string) => void
  isOver?: boolean
  isOverlay?: boolean
}

export function KanbanColumn({
  column,
  onAddTask,
  onDeleteTask,
  onEditTask,
  onViewTask,
  onUpdateColumn,
  onDeleteColumn,
  isOver,
  isOverlay,
}: KanbanColumnProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { setNodeRef: setDroppableRef, isOver: isDroppableOver } = useDroppable({
    id: column.id,
  })

  const sortable = useSortable({ id: column.id, disabled: isOverlay })

  const style = isOverlay
    ? { opacity: 0.9 }
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }

  const highlighted = isOver || isDroppableOver

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
    <div
      ref={isOverlay ? undefined : sortable.setNodeRef}
      style={style}
      className={`flex flex-col w-72 h-[calc(100vh-8rem)] rounded-xl shrink-0 transition-all duration-200 ${
        highlighted
          ? 'bg-violet-50/80 ring-2 ring-violet-300/60 ring-offset-1'
          : 'bg-gray-50/80'
      } ${sortable.isDragging ? 'opacity-40' : ''}`}
    >
      {/* Color bar behind column title */}
      {column.color && (
        <div
          className="h-1.5 rounded-t-xl shrink-0"
          style={{ backgroundColor: column.color }}
        />
      )}

      {/* Column Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2"
        style={column.color ? { backgroundColor: column.color + '33' } : undefined} /* 33 = 20% opacity in hex */
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Drag handle */}
          <button
            {...(isOverlay ? {} : sortable.attributes)}
            {...(isOverlay ? {} : sortable.listeners)}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors shrink-0 touch-none"
            aria-label="Drag to reorder column"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="4" r="1.5" />
              <circle cx="13" cy="4" r="1.5" />
              <circle cx="7" cy="10" r="1.5" />
              <circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="16" r="1.5" />
              <circle cx="13" cy="16" r="1.5" />
            </svg>
          </button>
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenameValue(column.title); setIsRenaming(false) } }}
              className="text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400 w-full"
              autoFocus
            />
          ) : (
            <h3 className="font-semibold text-gray-600 text-xs uppercase tracking-wider truncate">
              {column.title}
            </h3>
          )}
          {column.isStart && (
            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded whitespace-nowrap" title="Start column" aria-label="Start column">START</span>
          )}
          {column.isEnd && (
            <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded whitespace-nowrap" title="End column" aria-label="End column">END</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-semibold text-gray-400 bg-white/80 px-1.5 py-0.5 rounded-md">
            {column.tasks.length}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-white/80"
              aria-label="Column settings"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-7 z-50 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-xs">
                <button
                  onClick={() => { setIsRenaming(true); setShowMenu(false); setRenameValue(column.title) }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={handleToggleStart}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  {column.isStart ? 'Unset Start' : 'Set as Start'}
                </button>
                <button
                  onClick={handleToggleEnd}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  {column.isEnd ? 'Unset End' : 'Set as End'}
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={handleDelete}
                  className={`w-full text-left px-3 py-1.5 transition-colors ${confirmDelete ? 'bg-red-50 text-red-700 font-semibold' : 'hover:bg-red-50 text-red-600'}`}
                  aria-label={confirmDelete ? 'Press again to confirm deletion' : 'Delete column'}
                >
                  {confirmDelete ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <SortableContext
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setDroppableRef}
          tabIndex={0}
          className={`flex flex-col gap-1.5 px-2 pb-2 min-h-0 flex-1 overflow-y-auto transition-colors duration-200 rounded-lg mx-1 ${
            highlighted ? 'bg-violet-100/30' : ''
          }`}
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={onEditTask}
              onView={onViewTask}
            />
          ))}
          {column.tasks.length === 0 && (
            <div className={`flex items-center justify-center h-20 rounded-lg border-2 border-dashed transition-colors duration-200 ${
              highlighted ? 'border-violet-300 bg-violet-50/50' : 'border-gray-200/60'
            }`}>
              <span className="text-xs text-gray-400">
                {highlighted ? 'Drop here' : 'No tasks'}
              </span>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add Task */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onAddTask(column.id)}
          className="w-full px-2 py-1.5 text-left text-gray-400 hover:text-gray-600 rounded-lg transition-colors text-xs font-medium hover:bg-white/60"
        >
          + Add task
        </button>
      </div>
    </div>
  )
}
