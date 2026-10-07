import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import type { Block, Task, TaskChanges } from '../types'
import TaskItem from './TaskItem'


interface TaskBlockProps {
  id: string
  name: string
  className: string
  blocks: Block[]
  tasks: Task[]
  color?: string
  onChangeColor: (id: string, color: string) => void
  canDelete: boolean
  onDeleteBlock: (id: string) => void
  onToggleComplete: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, changes: TaskChanges) => void
}

// Texto oscuro sobre fondos claros y claro sobre fondos oscuros
const getTextColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#08060d' : '#f3f4f6'
}

const rgbToHex = (rgb: string) =>
  '#' +
  (rgb.match(/\d+/g) ?? [])
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')

function TaskBlock({
  id,
  name,
  className,
  blocks,
  tasks,
  color,
  onChangeColor,
  canDelete,
  onDeleteBlock,
  onToggleComplete,
  onDelete,
  onEdit,
}: TaskBlockProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)
  const sortedTasks = [...tasks].sort((a, b) => a.importance - b.importance)

  // Cierra el menú de opciones al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!isOptionsOpen) return

    const handleMouseDown = (e: globalThis.MouseEvent) => {
      if (!optionsRef.current?.contains(e.target as Node)) setIsOptionsOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOptionsOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOptionsOpen])

  const style = color
    ? ({ background: color, '--block-text': getTextColor(color) } as CSSProperties)
    : undefined

  // Sin color propio, el selector se abre con el color actual del bloque
  const handleColorClick = (e: MouseEvent<HTMLInputElement>) => {
    if (color) return

    const section = e.currentTarget.closest('.task-block')
    if (section) {
      e.currentTarget.value = rgbToHex(getComputedStyle(section).backgroundColor)
    }
  }

  return (
    <section className={`task-block ${className}`} style={style}>
      <header className="block-header">
        <h2>{name}</h2>
        <div className="block-options" ref={optionsRef}>
          <button
            type="button"
            aria-expanded={isOptionsOpen}
            onClick={() => setIsOptionsOpen((open) => !open)}
          >
            Opciones
          </button>
          {isOptionsOpen && (
            <div className="options-menu">
              <label className="color-picker">
                Color
                <input
                  type="color"
                  defaultValue={color ?? '#ffffff'}
                  onClick={handleColorClick}
                  onChange={(e) => onChangeColor(id, e.target.value)}
                />
              </label>
              {canDelete && (
                <button type="button" onClick={() => onDeleteBlock(id)}>
                  Eliminar bloque
                </button>
              )}
            </div>
          )}
        </div>
      </header>
      {sortedTasks.length === 0 ? (
        <p className="empty">Sin tareas</p>
      ) : (
        <ul>
          {sortedTasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              blocks={blocks}
              isTopPriority={index === 0}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default TaskBlock
