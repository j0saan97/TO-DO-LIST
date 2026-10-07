import { useState } from 'react'
import type { Block, Task, TaskChanges } from '../types'


interface TaskItemProps {
  task: Task
  blocks: Block[]
  isTopPriority: boolean
  onToggleComplete: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, changes: TaskChanges) => void
}

function TaskItem({
  task,
  blocks,
  isTopPriority,
  onToggleComplete,
  onDelete,
  onEdit,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(task.text)
  const [selectedBlock, setBlock] = useState(task.blockId)
  // Si el bloque elegido se ha eliminado, volvemos al de la tarea
  const blockId = blocks.some((b) => b.id === selectedBlock)
    ? selectedBlock
    : task.blockId
  const [importance, setImportance] = useState(task.importance)

  const handleSave = () => {
    const trimmed = text.trim()
    if (!trimmed) return

    onEdit(task.id, { text: trimmed, blockId, importance })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setText(task.text)
    setBlock(task.blockId)
    setImportance(task.importance)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <li className="task-item editing">
        <input value={text} onChange={(e) => setText(e.target.value)} />
        <select
          value={blockId}
          onChange={(e) => setBlock(e.target.value)}
        >
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={importance}
          onChange={(e) =>
            setImportance(Math.max(1, Number(e.target.value) || 1))
          }
        />
        <div className="task-actions">
          <button type="button" onClick={handleSave}>
            Guardar
          </button>
          <button type="button" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      </li>
    )
  }

  return (
    <li
      className={`task-item${task.completed ? ' completed' : ''}${
        isTopPriority ? ' top-priority' : ''
      }`}
    >
      <label className="task-check">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggleComplete(task.id)}
        />
        <span className="task-text">{task.text}</span>
      </label>
      <span className="task-importance">#{task.importance}</span>
      <div className="task-actions">
        <button type="button" onClick={() => setIsEditing(true)}>
          Editar
        </button>
        <button type="button" onClick={() => onDelete(task.id)}>
          Eliminar
        </button>
      </div>
    </li>
  )
}

export default TaskItem
