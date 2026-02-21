'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from './KanbanBoard'

const PRIORITY_CONFIG: Record<string, { dot: string; badge: string; accent: string }> = {
  critical: { dot: 'bg-red-500', badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800', accent: 'border-l-red-500' },
  high: { dot: 'bg-orange-500', badge: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800', accent: 'border-l-orange-400' },
  medium: { dot: 'bg-blue-500', badge: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800', accent: 'border-l-blue-400' },
  low: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800', accent: 'border-l-emerald-400' },
  nice_to_have: { dot: 'bg-gray-400', badge: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600', accent: 'border-l-gray-300 dark:border-l-gray-600' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

// Parse `[TICKET-123](url)` markdown-style links in task title
function renderTitle(title: string) {
  const match = title.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  if (match) {
    const url = match[2]
    const isSafeUrl = /^https?:\/\//i.test(url)
    if (isSafeUrl) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 hover:underline font-medium"
        >
          {match[1]}
        </a>
      )
    }
  }
  return <span>{title}</span>
}

type TaskCardProps = {
  task: Task
  isDragging?: boolean
  isOverlay?: boolean
  onDelete?: () => void
  onEdit?: (task: Task) => void
  onView?: (task: Task) => void
  onTogglePin?: () => void
  pinnedCount?: number
}

export function TaskCard({ task, isDragging, isOverlay, onDelete, onEdit, onView, onTogglePin, pinnedCount = 0 }: TaskCardProps) {
  const sortable = useSortable({ id: task.id, disabled: isOverlay })

  const style = isOverlay
    ? { opacity: 0.9 }
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.4 : 1,
      }

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  const handleCardClick = () => {
    if (onView && !isDragging && !isOverlay && !sortable.isDragging) {
      onView(task)
    }
  }

  const canPin = task.pinned || pinnedCount < 3

  return (
    <div
      ref={isOverlay ? undefined : sortable.setNodeRef}
      style={style}
      {...(isOverlay ? {} : sortable.attributes)}
      {...(isOverlay ? {} : sortable.listeners)}
      onClick={handleCardClick}
      className={`bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200/80 dark:border-gray-700/80 border-l-[3px] ${priority.accent} group select-none ${
        task.pinned ? 'ring-1 ring-amber-300/50 dark:ring-amber-600/50' : ''
      } ${
        isDragging || isOverlay
          ? 'shadow-xl ring-2 ring-violet-300/50 rotate-[1.5deg] scale-[1.02]'
          : sortable.isDragging
            ? 'opacity-40'
            : 'shadow-sm hover:shadow-md hover:border-gray-300/80 dark:hover:border-gray-600/80 cursor-grab active:cursor-grabbing'
      } transition-shadow duration-150`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${priority.dot}`} />
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priority.badge}`}>
              {task.priority.replace('_', ' ')}
            </span>
            {task.pinned && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400" title="Pinned">📌</span>
            )}
          </div>
          <h4 className="text-[13px] font-medium text-gray-800 dark:text-gray-200 break-words leading-snug">
            {renderTitle(task.title)}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2 break-words leading-relaxed">
              {task.description.length > 80
                ? task.description.slice(0, 80) + '…'
                : task.description}
            </p>
          )}
          {task.images && task.images.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] text-gray-400">{task.images.length}</span>
            </div>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-[10px] text-gray-400">{task.subtasks.filter(st => st.done).length}/{task.subtasks.length}</span>
            </div>
          )}
          {(task.startDate || task.endDate) && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-medium">
              {task.startDate && <span className="bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded">{formatDate(task.startDate)}</span>}
              {task.startDate && task.endDate && <span className="text-gray-300 dark:text-gray-600">→</span>}
              {task.endDate && <span className="bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded">{formatDate(task.endDate)}</span>}
            </div>
          )}
        </div>
        {!isDragging && !isOverlay && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            {onTogglePin && canPin && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin()
                }}
                className={`transition-colors p-0.5 ${task.pinned ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-amber-500'}`}
                aria-label={task.pinned ? 'Unpin task' : 'Pin task'}
                title={task.pinned ? 'Unpin' : pinnedCount >= 3 ? 'Max 3 pinned' : 'Pin to top'}
              >
                <svg className="w-3.5 h-3.5" fill={task.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(task)
                }}
                className="text-gray-300 hover:text-violet-500 transition-colors p-0.5"
                aria-label="Edit task"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                aria-label="Delete task"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
