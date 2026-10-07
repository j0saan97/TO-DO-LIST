import { useState, type FormEvent } from 'react'
import type { Block, TaskChanges } from '../types'

interface TaskFormProps {
  blocks: Block[]
  onAdd: (task: TaskChanges) => void
}

function TaskForm({ blocks, onAdd }: TaskFormProps) {
  const [text, setText] = useState('')
  const [selectedBlock, setBlock] = useState(blocks[0].id)
  // Si el bloque elegido se ha eliminado, volvemos al primero disponible
  const blockId = blocks.some((b) => b.id === selectedBlock)
    ? selectedBlock
    : blocks[0].id
  const [importance, setImportance] = useState(1)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    onAdd({ text: trimmed, blockId, importance })
    setText('')
    setImportance(1)
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nueva tarea..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
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
        step={1}
        value={importance}
        onChange={(e) => setImportance(Math.max(1, Number(e.target.value) || 1))}
      />
      <button type="submit">Añadir</button>
    </form>
  )
}

export default TaskForm
