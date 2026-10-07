export type BlockName = string

export interface Block {
  name: BlockName
  className: string
  // Color elegido por el usuario; si no hay, manda el de className
  color?: string
}

export interface Task {
  id: number
  text: string
  block: BlockName
  importance: number
  completed: boolean
}

export const INITIAL_BLOCKS: Block[] = [
  { name: 'Poker', className: 'block-poker' },
  { name: 'Programación', className: 'block-programacion' },
  { name: 'Huerta', className: 'block-poker' },
  { name: 'Tareas varias', className: 'block-tareas-varias' },
]

export const EXTRA_BLOCK_CLASSES = [
  'block-extra-1',
  'block-extra-2',
  'block-extra-3',
  'block-extra-4',
]
