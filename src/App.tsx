import { useRef, useState } from 'react'
import './App.css'
import TaskForm from './components/TaskForm'
import BlockForm from './components/BlockForm'
import TaskBlock from './components/TaskBlock'
import {
  EXTRA_BLOCK_CLASSES,
  INITIAL_BLOCKS,
  type Block,
  type BlockName,
  type Task,
} from './types'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS)
  const nextId = useRef(1)
  const nextExtraClass = useRef(0)

  const handleAdd = (newTask: Omit<Task, 'id' | 'completed'>) => {
    setTasks((prev) => [
      ...prev,
      { ...newTask, id: nextId.current++, completed: false },
    ])
  }

  const handleAddBlock = (name: BlockName) => {
    if (blocks.some((b) => b.name === name)) return

    const className =
      EXTRA_BLOCK_CLASSES[nextExtraClass.current++ % EXTRA_BLOCK_CLASSES.length]
    setBlocks((prev) => [...prev, { name, className }])
  }

  const handleDeleteBlock = (name: BlockName) => {
    const count = tasks.filter((t) => t.block === name).length
    if (
      count > 0 &&
      !window.confirm(
        `El bloque "${name}" tiene ${count} tarea(s). ¿Eliminarlo junto con sus tareas?`,
      )
    ) {
      return
    }

    setBlocks((prev) => prev.filter((b) => b.name !== name))
    setTasks((prev) => prev.filter((t) => t.block !== name))
  }

  const handleChangeBlockColor = (name: BlockName, color: string) => {
    setBlocks((prev) => prev.map((b) => (b.name === name ? { ...b, color } : b)))
  }

  const handleToggleComplete =(id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    )
  }

  const handleDelete = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const handleEdit = (
    id: number,
    changes: { text: string; block: BlockName; importance: number },
  ) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)))
  }

  return (
    <main id="app">
      <h1>To-Do List</h1>
      <TaskForm blocks={blocks} onAdd={handleAdd} />
      <BlockForm blocks={blocks} onAddBlock={handleAddBlock} />
      <div className="board">
        {blocks.map((b) => (
          <TaskBlock
            key={b.name}
            name={b.name}
            className={b.className}
            blocks={blocks}
            tasks={tasks.filter((t) => t.block === b.name)}
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
    </main>
  )
}

export default App
