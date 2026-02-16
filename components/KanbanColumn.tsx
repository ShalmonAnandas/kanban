'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { Column } from './KanbanBoard'

type KanbanColumnProps = {
  column: Column
  onCreateTask: (columnId: string, title: string) => void
  onDeleteTask: (taskId: string) => void
}

export function KanbanColumn({
  column,
  onCreateTask,
  onDeleteTask,
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskTitle.trim()) {
      onCreateTask(column.id, newTaskTitle.trim())
      setNewTaskTitle('')
      setIsAddingTask(false)
    }
  }

  return (
    <div className="flex flex-col w-80 bg-gray-100 rounded-lg p-4 shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{column.title}</h3>
        <span className="text-sm text-gray-500">{column.tasks.length}</span>
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
            />
          ))}
        </div>
      </SortableContext>

      {isAddingTask ? (
        <form onSubmit={handleSubmit} className="mt-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Enter task title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            autoFocus
            onBlur={() => {
              if (!newTaskTitle.trim()) {
                setIsAddingTask(false)
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingTask(false)
                setNewTaskTitle('')
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAddingTask(true)}
          className="mt-2 w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
        >
          + Add task
        </button>
      )}
    </div>
  )
}
