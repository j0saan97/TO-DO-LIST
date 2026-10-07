import type { Block, Task, TaskChanges } from '../types'
import { supabase } from './supabase'

interface BlockRow {
  id: string
  name: string
  class_name: string
  color: string | null
}

interface TaskRow {
  id: number
  text: string
  block_id: string
  importance: number
  completed: boolean
}

const BLOCK_COLUMNS = 'id, name, class_name, color'
const TASK_COLUMNS = 'id, text, block_id, importance, completed'

const toBlock = (row: BlockRow): Block => ({
  id: row.id,
  name: row.name,
  className: row.class_name,
  color: row.color ?? undefined,
})

const toTask = (row: TaskRow): Task => ({
  id: row.id,
  text: row.text,
  blockId: row.block_id,
  importance: row.importance,
  completed: row.completed,
})

const toTaskRow = (changes: Partial<Omit<Task, 'id'>>) => ({
  text: changes.text,
  block_id: changes.blockId,
  importance: changes.importance,
  completed: changes.completed,
})

export async function fetchBlocks(): Promise<Block[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select(BLOCK_COLUMNS)
    .order('created_at')
    .overrideTypes<BlockRow[], { merge: false }>()
  if (error) throw error
  return data.map(toBlock)
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .order('created_at')
    .overrideTypes<TaskRow[], { merge: false }>()
  if (error) throw error
  return data.map(toTask)
}

export async function addBlock(name: string, className: string): Promise<Block> {
  const { data, error } = await supabase
    .from('blocks')
    .insert({ name, class_name: className })
    .select(BLOCK_COLUMNS)
    .single()
    .overrideTypes<BlockRow, { merge: false }>()
  if (error) throw error
  return toBlock(data)
}

export async function updateBlockColor(id: string, color: string): Promise<void> {
  const { error } = await supabase.from('blocks').update({ color }).eq('id', id)
  if (error) throw error
}

// Las tareas del bloque se borran en cascada en la base de datos
export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('id', id)
  if (error) throw error
}

export async function addTask(task: TaskChanges): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(toTaskRow(task))
    .select(TASK_COLUMNS)
    .single()
    .overrideTypes<TaskRow, { merge: false }>()
  if (error) throw error
  return toTask(data)
}

export async function updateTask(
  id: number,
  changes: Partial<Omit<Task, 'id'>>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(toTaskRow(changes))
    .eq('id', id)
    .select(TASK_COLUMNS)
    .single()
    .overrideTypes<TaskRow, { merge: false }>()
  if (error) throw error
  return toTask(data)
}

export async function deleteTask(id: number): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
