import { useEffect, useRef, useState } from 'react'
import TaskForm from './TaskForm'
import BlockForm from './BlockForm'
import TaskBlock from './TaskBlock'
import * as api from '../lib/api'
import {
  EXTRA_BLOCK_CLASSES,
  type Block,
  type Task,
  type TaskChanges,
} from '../types'

const COLOR_SAVE_DELAY = 400

function Board() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const colorTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    Promise.all([api.fetchBlocks(), api.fetchTasks()])
      .then(([loadedBlocks, loadedTasks]) => {
        setBlocks(loadedBlocks)
        setTasks(loadedTasks)
      })
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setIsLoading(false))
  }, [])

  // Ejecuta una operación contra Supabase y avisa si falla
  const run = async (action: () => Promise<void>) => {
    setError('')
    try {
      await action()
    } catch {
      setError('No se pudo guardar el cambio. Revisa tu conexión.')
    }
  }

  const handleAdd = (newTask: TaskChanges) =>
    run(async () => {
      const task = await api.addTask(newTask)
      setTasks((prev) => [...prev, task])
    })

  const handleAddBlock = (name: string) => {
    if (blocks.some((b) => b.name === name)) return

    const className = EXTRA_BLOCK_CLASSES[blocks.length % EXTRA_BLOCK_CLASSES.length]
    return run(async () => {
      const block = await api.addBlock(name, className)
      setBlocks((prev) => [...prev, block])
    })
  }

  const handleDeleteBlock = (id: string) => {
    const name = blocks.find((b) => b.id === id)?.name
    const count = tasks.filter((t) => t.blockId === id).length
    if (
      count > 0 &&
      !window.confirm(
        `El bloque "${name}" tiene ${count} tarea(s). ¿Eliminarlo junto con sus tareas?`,
      )
    ) {
      return
    }

    return run(async () => {
      await api.deleteBlock(id)
      setBlocks((prev) => prev.filter((b) => b.id !== id))
      setTasks((prev) => prev.filter((t) => t.blockId !== id))
    })
  }

  // El selector emite muchos cambios seguidos: se pinta al momento y se guarda al parar
  const handleChangeBlockColor = (id: string, color: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, color } : b)))

    window.clearTimeout(colorTimer.current)
    colorTimer.current = window.setTimeout(
      () => run(() => api.updateBlockColor(id, color)),
      COLOR_SAVE_DELAY,
    )
  }

  const replaceTask = (updated: Task) =>
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))

  const handleToggleComplete = (id: number) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    return run(async () => {
      replaceTask(await api.updateTask(id, { completed: !task.completed }))
    })
  }

  const handleDelete = (id: number) =>
    run(async () => {
      await api.deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    })

  const handleEdit = (id: number, changes: TaskChanges) =>
    run(async () => {
      replaceTask(await api.updateTask(id, changes))
    })

  if (isLoading) return <p>Cargando...</p>

  return (
    <>
      {error && <p className="form-error board-error">{error}</p>}
      {blocks.length > 0 && <TaskForm blocks={blocks} onAdd={handleAdd} />}
      <BlockForm blocks={blocks} onAddBlock={handleAddBlock} />
      <div className="board">
        {blocks.map((b) => (
          <TaskBlock
            key={b.id}
            id={b.id}
            name={b.name}
            className={b.className}
            blocks={blocks}
            tasks={tasks.filter((t) => t.blockId === b.id)}
            color={b.color}
            onChangeColor={handleChangeBlockColor}
            canDelete={blocks.length > 1}
            onDeleteBlock={handleDeleteBlock}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
      </div>
    </>
  )
}

export default Board
