import { storeToRefs } from 'pinia'
import type { ComputedRef, Ref } from 'vue'
import { useTodoStore } from '../stores/todo'
import type { FilterState, Project, Task, TaskFormInput, TodoInsights, TodoStats } from '../types/todo'

export interface UseTodoListResult {
  tasks: Ref<Task[]>
  projects: Ref<Project[]>
  filters: Ref<FilterState>
  visibleTasks: ComputedRef<Task[]>
  stats: ComputedRef<TodoStats>
  insights: ComputedRef<TodoInsights>
  selectedTaskIds: Ref<string[]>
  snackbar: Ref<{ message: string } | null>
  defaultProjectId: string
  projectNameById: ComputedRef<Map<string, string>>
  notificationPermission: Ref<NotificationPermission | 'unsupported'>
  notificationsEnabled: Ref<boolean>
  addProject: (projectName: string) => boolean
  removeProject: (projectId: string) => void
  addTask: (input: TaskFormInput) => boolean
  updateTask: (taskId: string, input: TaskFormInput) => boolean
  setTaskCompleted: (taskId: string, completed: boolean) => boolean
  toggleTaskCompleted: (taskId: string) => void
  deleteTask: (taskId: string) => void
  deleteSelectedTasks: () => void
  toggleTaskSelected: (taskId: string) => void
  clearSelectedTasks: () => void
  addSubtask: (taskId: string, text: string, plannedAtInput?: string) => boolean
  toggleSubtaskCompleted: (taskId: string, subtaskId: string) => void
  setSubtaskPlannedAt: (taskId: string, subtaskId: string, plannedAt: string | null) => boolean
  setSubtaskText: (taskId: string, subtaskId: string, text: string) => boolean
  deleteSubtask: (taskId: string, subtaskId: string) => void
  reorderTasks: (draggedTaskId: string, targetTaskId: string) => void
  sortTasksByDueDate: () => boolean
  sortTasksByPriorityAndDueDate: () => boolean
  dueStatus: (task: Task) => 'none' | 'overdue' | 'today' | 'tomorrow' | 'week'
  dueHint: (task: Task) => string | null
  undoLastAction: () => void
  toLocalDateTimeInputValue: (isoDate: string | null) => string
  toIsoDate: (localDateTime: string) => string | null
  formatDueDate: (isoDate: string | null) => string
  requestNotificationAccess: () => Promise<void>
}

const createTodoList = (): UseTodoListResult => {
  const store = useTodoStore()
  store.initialize()

  const {
    tasks,
    projects,
    filters,
    visibleTasks,
    stats,
    insights,
    selectedTaskIds,
    snackbar,
    projectNameById,
    notificationPermission,
    notificationsEnabled,
  } = storeToRefs(store)

  return {
    tasks,
    projects,
    filters,
    visibleTasks,
    stats,
    insights,
    selectedTaskIds,
    snackbar,
    defaultProjectId: store.defaultProjectId,
    projectNameById,
    notificationPermission,
    notificationsEnabled,
    addProject: store.addProject,
    removeProject: store.removeProject,
    addTask: store.addTask,
    updateTask: store.updateTask,
    setTaskCompleted: store.setTaskCompleted,
    toggleTaskCompleted: store.toggleTaskCompleted,
    deleteTask: store.deleteTask,
    deleteSelectedTasks: store.deleteSelectedTasks,
    toggleTaskSelected: store.toggleTaskSelected,
    clearSelectedTasks: store.clearSelectedTasks,
    addSubtask: store.addSubtask,
    toggleSubtaskCompleted: store.toggleSubtaskCompleted,
    setSubtaskPlannedAt: store.setSubtaskPlannedAt,
    setSubtaskText: store.setSubtaskText,
    deleteSubtask: store.deleteSubtask,
    reorderTasks: store.reorderTasks,
    sortTasksByDueDate: store.sortTasksByDueDate,
    sortTasksByPriorityAndDueDate: store.sortTasksByPriorityAndDueDate,
    dueStatus: store.dueStatus,
    dueHint: store.dueHint,
    undoLastAction: store.undoLastAction,
    toLocalDateTimeInputValue: store.toLocalDateTimeInputValue,
    toIsoDate: store.toIsoDate,
    formatDueDate: store.formatDueDate,
    requestNotificationAccess: store.requestNotificationAccess,
  }
}

export const useTodoList: typeof createTodoList = createTodoList
