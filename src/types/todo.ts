export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskStatusFilter = 'all' | 'active' | 'completed'

export type DueFilter = 'all' | 'today' | 'tomorrow' | 'overdue' | 'week'

export type SortMode = 'created_desc' | 'due_asc' | 'priority_desc' | 'manual'

export interface Subtask {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  completed: boolean
  priority: TaskPriority
  dueDate: string | null
  projectId: string
  subtasks: Subtask[]
  manualOrder: number
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  createdAt: string
}

export interface TaskFormInput {
  title: string
  description: string
  dueDate: string
  priority: TaskPriority
  projectId: string
}

export interface FilterState {
  search: string
  status: TaskStatusFilter
  priority: TaskPriority | 'all'
  projectId: string | 'all'
  due: DueFilter
  sortBy: SortMode
}

export interface TodoPersistedState {
  version: 1
  tasks: Task[]
  projects: Project[]
}
