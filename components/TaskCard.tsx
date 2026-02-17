'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from './KanbanBoard'

const PRIORITY_CONFIG: Record<string, { dot: string; badge: string; accent: string }> = {
  critical: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border border-red-200', accent: 'border-l-red-500' },
  high: { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border border-orange-200', accent: 'border-l-orange-400' },
  medium: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border border-blue-200', accent: 'border-l-blue-400' },
  low: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', accent: 'border-l-emerald-400' },
  nice_to_have: { dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border border-gray-200', accent: 'border-l-gray-300' },
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
          className="text-violet-600 hover:text-violet-800 hover:underline font-medium"
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
}

export function TaskCard({ task, isDragging, isOverlay, onDelete, onEdit }: TaskCardProps) {
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
    if (onEdit && !isDragging && !isOverlay && !sortable.isDragging) {
      onEdit(task)
    }
  }

  return (
    <div
      ref={isOverlay ? undefined : sortable.setNodeRef}
      style={style}
      {...(isOverlay ? {} : sortable.attributes)}
      {...(isOverlay ? {} : sortable.listeners)}
      onClick={handleCardClick}
      className={`bg-white rounded-lg p-3 border border-gray-200/80 border-l-[3px] ${priority.accent} group select-none ${
        isDragging || isOverlay
          ? 'shadow-xl ring-2 ring-violet-300/50 rotate-[1.5deg] scale-[1.02]'
          : sortable.isDragging
            ? 'opacity-40'
            : 'shadow-sm hover:shadow-md hover:border-gray-300/80 cursor-grab active:cursor-grabbing'
      } transition-shadow duration-150`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${priority.dot}`} />
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priority.badge}`}>
              {task.priority.replace('_', ' ')}
            </span>
          </div>
          <h4 className="text-[13px] font-medium text-gray-800 break-words leading-snug">
            {renderTitle(task.title)}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 break-words leading-relaxed">
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
          {(task.startDate || task.endDate) && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-medium">
              {task.startDate && <span className="bg-gray-50 px-1.5 py-0.5 rounded">📅 {formatDate(task.startDate)}</span>}
              {task.startDate && task.endDate && <span className="text-gray-300">→</span>}
              {task.endDate && <span className="bg-gray-50 px-1.5 py-0.5 rounded">🏁 {formatDate(task.endDate)}</span>}
            </div>
          )}
        </div>
        {onDelete && !isDragging && !isOverlay && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-gray-300 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
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
    </div>
  )
}
