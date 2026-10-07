import { useState, type FormEvent } from 'react'
import type { Block, BlockName } from '../types'

interface BlockFormProps {
  blocks: Block[]
  onAddBlock: (name: BlockName) => void
}

function BlockForm({ blocks, onAddBlock }: BlockFormProps) {
  const [name, setName] = useState('')

  const trimmed = name.trim()
  const isDuplicate = blocks.some(
    (b) => b.name.toLowerCase() === trimmed.toLowerCase(),
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!trimmed || isDuplicate) return

    onAddBlock(trimmed)
    setName('')
  }

  return (
    <form className="task-form block-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nuevo bloque..."
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={!trimmed || isDuplicate}>
        Añadir bloque
      </button>
      {isDuplicate && <p className="form-error">Ya existe un bloque con ese nombre</p>}
    </form>
  )
}

export default BlockForm
