export interface Block {
  id: string
  name: string
  className: string
  // Color elegido por el usuario; si no hay, manda el de className
  color?: string
}

export interface Task {
  id: number
  text: string
  blockId: string
  importance: number
  completed: boolean
}

export type TaskChanges = Pick<Task, 'text' | 'blockId' | 'importance'>

export const EXTRA_BLOCK_CLASSES = [
  'block-extra-1',
  'block-extra-2',
  'block-extra-3',
  'block-extra-4',
]
