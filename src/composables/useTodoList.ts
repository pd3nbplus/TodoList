import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type {
  DueFilter,
  FilterState,
  Project,
  SortMode,
  Subtask,
  Task,
  TaskFormInput,
  TaskPriority,
  TodoPersistedState,
} from '../types/todo'

const STORAGE_KEY = 'todo-list-state-v1'
const STORAGE_VERSION = 1
const SNACKBAR_MS = 5000
const DEFAULT_PROJECT_ID = 'inbox'

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  status: 'all',
  priority: 'all',
  projectId: 'all',
  due: 'all',
  sortBy: 'created_desc',
}

interface Snapshot {
  tasks: Task[]
  projects: Project[]
}

interface SnackbarState {
  message: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dayDiffFromToday(isoDate: string): number {
  const due = startOfDay(new Date(isoDate))
  const today = startOfDay(new Date())
  const oneDayMs = 24 * 60 * 60 * 1000
  return Math.floor((due.getTime() - today.getTime()) / oneDayMs)
}

function toLocalDateTimeInputValue(isoDate: string | null): string {
  if (!isoDate) {
    return ''
  }

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

function toIsoDate(localDateTime: string): string | null {
  if (!localDateTime.trim()) {
    return null
  }

  const date = new Date(localDateTime)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function formatDueDate(isoDate: string | null): string {
  if (!isoDate) {
    return '无截止时间'
  }

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return '无截止时间'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function normalizeProjects(projects: Project[]): Project[] {
  if (projects.length === 0) {
    return [{ id: DEFAULT_PROJECT_ID, name: '默认清单', createdAt: nowIso() }]
  }

  const hasDefault = projects.some((item) => item.id === DEFAULT_PROJECT_ID)
  if (hasDefault) {
    return projects
  }

  return [{ id: DEFAULT_PROJECT_ID, name: '默认清单', createdAt: nowIso() }, ...projects]
}

function normalizeTasks(tasks: Task[], projectIds: Set<string>): Task[] {
  return tasks
    .map((item, index) => {
      const dueDate = item.dueDate && !Number.isNaN(new Date(item.dueDate).getTime()) ? item.dueDate : null
      const safeProjectId = projectIds.has(item.projectId) ? item.projectId : DEFAULT_PROJECT_ID
      const safeSubtasks = Array.isArray(item.subtasks)
        ? item.subtasks.map((subtask, subIndex) => ({
            id: subtask.id || createId(`sub-${subIndex}`),
            text: subtask.text || '',
            completed: Boolean(subtask.completed),
            createdAt: subtask.createdAt || item.createdAt || nowIso(),
          }))
        : []

      return {
        id: item.id || createId(`task-${index}`),
        title: item.title || '',
        description: item.description || '',
        completed: Boolean(item.completed),
        priority: item.priority || 'medium',
        dueDate,
        projectId: safeProjectId,
        subtasks: safeSubtasks,
        manualOrder: Number.isFinite(item.manualOrder) ? item.manualOrder : index + 1,
        createdAt: item.createdAt || nowIso(),
        updatedAt: item.updatedAt || item.createdAt || nowIso(),
      } satisfies Task
    })
    .filter((item) => item.title.trim().length > 0)
}

function dueFilterPasses(task: Task, filter: DueFilter): boolean {
  if (filter === 'all') {
    return true
  }

  if (!task.dueDate) {
    return false
  }

  const diff = dayDiffFromToday(task.dueDate)

  if (filter === 'today') {
    return diff === 0
  }

  if (filter === 'tomorrow') {
    return diff === 1
  }

  if (filter === 'overdue') {
    return diff < 0
  }

  return diff >= 0 && diff <= 7
}

function taskComparator(sortBy: SortMode): (a: Task, b: Task) => number {
  if (sortBy === 'manual') {
    return (a, b) => a.manualOrder - b.manualOrder
  }

  if (sortBy === 'due_asc') {
    return (a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
  }

  if (sortBy === 'priority_desc') {
    return (a, b) => {
      const diff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      if (diff !== 0) return diff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  }

  return (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

export function useTodoList() {
  const tasks = ref<Task[]>([])
  const projects = ref<Project[]>([])
  const filters = reactive<FilterState>({ ...DEFAULT_FILTERS })
  const selectedTaskIds = ref<string[]>([])
  const snackbar = ref<SnackbarState | null>(null)
  const notificationPermission = ref<NotificationPermission | 'unsupported'>('unsupported')
  const notificationsEnabled = ref(false)

  let undoSnapshot: Snapshot | null = null
  let snackbarTimer: number | null = null
  let dueCheckTimer: number | null = null
  const notifiedTaskIds = new Set<string>()

  function persistState() {
    if (typeof localStorage === 'undefined') {
      return
    }

    const payload: TodoPersistedState = {
      version: STORAGE_VERSION,
      tasks: tasks.value,
      projects: projects.value,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  function loadState() {
    if (typeof localStorage === 'undefined') {
      projects.value = normalizeProjects([])
      return
    }

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      projects.value = normalizeProjects([])
      return
    }

    try {
      const parsed = JSON.parse(raw) as Partial<TodoPersistedState>
      const safeProjects = normalizeProjects(Array.isArray(parsed.projects) ? parsed.projects : [])
      const projectIds = new Set(safeProjects.map((item) => item.id))

      projects.value = safeProjects
      tasks.value = normalizeTasks(Array.isArray(parsed.tasks) ? parsed.tasks : [], projectIds)
    } catch {
      projects.value = normalizeProjects([])
      tasks.value = []
    }
  }

  function clearSnackbar() {
    snackbar.value = null
    undoSnapshot = null
    if (snackbarTimer) {
      clearTimeout(snackbarTimer)
      snackbarTimer = null
    }
  }

  function setUndoSnapshot(message: string) {
    undoSnapshot = {
      tasks: deepClone(tasks.value),
      projects: deepClone(projects.value),
    }
    snackbar.value = { message }

    if (snackbarTimer) {
      clearTimeout(snackbarTimer)
    }

    snackbarTimer = window.setTimeout(() => {
      clearSnackbar()
    }, SNACKBAR_MS)
  }

  function undoLastAction() {
    if (!undoSnapshot) {
      return
    }

    tasks.value = deepClone(undoSnapshot.tasks)
    projects.value = deepClone(undoSnapshot.projects)
    selectedTaskIds.value = []
    clearSnackbar()
  }

  function syncNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      notificationPermission.value = 'unsupported'
      notificationsEnabled.value = false
      return
    }

    notificationPermission.value = Notification.permission
    notificationsEnabled.value = Notification.permission === 'granted'
  }

  async function requestNotificationAccess() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    const result = await Notification.requestPermission()
    notificationPermission.value = result
    notificationsEnabled.value = result === 'granted'
    maybeSendDueNotifications()
  }

  function maybeSendDueNotifications() {
    if (!notificationsEnabled.value || typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    for (const task of tasks.value) {
      if (task.completed || !task.dueDate || notifiedTaskIds.has(task.id)) {
        continue
      }

      const dueAt = new Date(task.dueDate).getTime()
      if (Number.isNaN(dueAt)) {
        continue
      }

      const diff = dueAt - now
      if (diff > 0 && diff <= oneDayMs) {
        new Notification(`任务临近截止：${task.title}`, {
          body: `截止时间：${formatDueDate(task.dueDate)}`,
        })
        notifiedTaskIds.add(task.id)
      }
    }
  }

  function getNextManualOrderForNewTask(): number {
    if (tasks.value.length === 0) {
      return 1
    }

    const minOrder = Math.min(...tasks.value.map((item) => item.manualOrder))
    return minOrder - 1
  }

  function resequenceManualOrder() {
    const reordered = [...tasks.value]
      .sort((a, b) => a.manualOrder - b.manualOrder)
      .map((item, index) => ({ ...item, manualOrder: index + 1 }))
    tasks.value = reordered
  }

  function addProject(projectName: string): boolean {
    const name = projectName.trim()
    if (!name) {
      return false
    }

    const exists = projects.value.some((item) => item.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      return false
    }

    projects.value = [...projects.value, { id: createId('project'), name, createdAt: nowIso() }]
    return true
  }

  function removeProject(projectId: string) {
    if (projectId === DEFAULT_PROJECT_ID) {
      return
    }

    const target = projects.value.find((item) => item.id === projectId)
    if (!target) {
      return
    }

    setUndoSnapshot(`已删除清单「${target.name}」，任务已移动到默认清单`)
    projects.value = projects.value.filter((item) => item.id !== projectId)
    tasks.value = tasks.value.map((item) =>
      item.projectId === projectId
        ? { ...item, projectId: DEFAULT_PROJECT_ID, updatedAt: nowIso() }
        : item,
    )

    if (filters.projectId === projectId) {
      filters.projectId = 'all'
    }
  }

  function addTask(input: TaskFormInput): boolean {
    const title = input.title.trim()
    if (!title) {
      return false
    }

    const safeProjectId = projects.value.some((item) => item.id === input.projectId)
      ? input.projectId
      : DEFAULT_PROJECT_ID

    const timestamp = nowIso()
    const task: Task = {
      id: createId('task'),
      title,
      description: input.description.trim(),
      completed: false,
      priority: input.priority,
      dueDate: toIsoDate(input.dueDate),
      projectId: safeProjectId,
      subtasks: [],
      manualOrder: getNextManualOrderForNewTask(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    tasks.value = [...tasks.value, task]
    return true
  }

  function updateTask(taskId: string, input: TaskFormInput): boolean {
    const title = input.title.trim()
    if (!title) {
      return false
    }

    const index = tasks.value.findIndex((item) => item.id === taskId)
    if (index === -1) {
      return false
    }

    const safeProjectId = projects.value.some((item) => item.id === input.projectId)
      ? input.projectId
      : DEFAULT_PROJECT_ID

    const previous = tasks.value[index]
    if (!previous) {
      return false
    }

    const next: Task = {
      ...previous,
      title,
      description: input.description.trim(),
      dueDate: toIsoDate(input.dueDate),
      priority: input.priority,
      projectId: safeProjectId,
      updatedAt: nowIso(),
    }

    tasks.value = [
      ...tasks.value.slice(0, index),
      next,
      ...tasks.value.slice(index + 1),
    ]

    return true
  }

  function toggleTaskCompleted(taskId: string) {
    const index = tasks.value.findIndex((item) => item.id === taskId)
    if (index === -1) {
      return
    }

    const current = tasks.value[index]
    if (!current) {
      return
    }

    setUndoSnapshot(current.completed ? '任务已恢复为未完成' : '任务已标记为完成')

    const nextCompleted = !current.completed
    const nextSubtasks = current.subtasks.map((item) => ({ ...item, completed: nextCompleted }))
    const updated: Task = {
      ...current,
      completed: nextCompleted,
      subtasks: nextSubtasks,
      updatedAt: nowIso(),
    }

    tasks.value = [
      ...tasks.value.slice(0, index),
      updated,
      ...tasks.value.slice(index + 1),
    ]
  }

  function deleteTask(taskId: string) {
    const target = tasks.value.find((item) => item.id === taskId)
    if (!target) {
      return
    }

    setUndoSnapshot(`已删除任务「${target.title}」`)
    tasks.value = tasks.value.filter((item) => item.id !== taskId)
    selectedTaskIds.value = selectedTaskIds.value.filter((id) => id !== taskId)
    resequenceManualOrder()
  }

  function deleteSelectedTasks() {
    if (selectedTaskIds.value.length === 0) {
      return
    }

    const selectedSet = new Set(selectedTaskIds.value)
    const total = selectedSet.size

    setUndoSnapshot(`已删除 ${total} 个任务`)
    tasks.value = tasks.value.filter((item) => !selectedSet.has(item.id))
    selectedTaskIds.value = []
    resequenceManualOrder()
  }

  function toggleTaskSelected(taskId: string) {
    if (selectedTaskIds.value.includes(taskId)) {
      selectedTaskIds.value = selectedTaskIds.value.filter((item) => item !== taskId)
      return
    }

    selectedTaskIds.value = [...selectedTaskIds.value, taskId]
  }

  function clearSelectedTasks() {
    selectedTaskIds.value = []
  }

  function addSubtask(taskId: string, text: string): boolean {
    const cleaned = text.trim()
    if (!cleaned) {
      return false
    }

    const index = tasks.value.findIndex((item) => item.id === taskId)
    if (index === -1) {
      return false
    }

    const task = tasks.value[index]
    if (!task) {
      return false
    }

    const subtask: Subtask = {
      id: createId('sub'),
      text: cleaned,
      completed: false,
      createdAt: nowIso(),
    }

    const updated: Task = {
      ...task,
      completed: false,
      subtasks: [...task.subtasks, subtask],
      updatedAt: nowIso(),
    }

    tasks.value = [
      ...tasks.value.slice(0, index),
      updated,
      ...tasks.value.slice(index + 1),
    ]

    return true
  }

  function toggleSubtaskCompleted(taskId: string, subtaskId: string) {
    const taskIndex = tasks.value.findIndex((item) => item.id === taskId)
    if (taskIndex === -1) {
      return
    }

    const task = tasks.value[taskIndex]
    if (!task) {
      return
    }

    const nextSubtasks = task.subtasks.map((item) =>
      item.id === subtaskId ? { ...item, completed: !item.completed } : item,
    )

    const shouldCompleteTask = nextSubtasks.length > 0 && nextSubtasks.every((item) => item.completed)
    const updated: Task = {
      ...task,
      completed: shouldCompleteTask,
      subtasks: nextSubtasks,
      updatedAt: nowIso(),
    }

    tasks.value = [
      ...tasks.value.slice(0, taskIndex),
      updated,
      ...tasks.value.slice(taskIndex + 1),
    ]
  }

  function deleteSubtask(taskId: string, subtaskId: string) {
    const taskIndex = tasks.value.findIndex((item) => item.id === taskId)
    if (taskIndex === -1) {
      return
    }

    const task = tasks.value[taskIndex]
    if (!task) {
      return
    }

    const nextSubtasks = task.subtasks.filter((item) => item.id !== subtaskId)
    const shouldCompleteTask = nextSubtasks.length > 0 && nextSubtasks.every((item) => item.completed)

    const updated: Task = {
      ...task,
      completed: shouldCompleteTask,
      subtasks: nextSubtasks,
      updatedAt: nowIso(),
    }

    tasks.value = [
      ...tasks.value.slice(0, taskIndex),
      updated,
      ...tasks.value.slice(taskIndex + 1),
    ]
  }

  function reorderTasks(draggedTaskId: string, targetTaskId: string) {
    if (draggedTaskId === targetTaskId) {
      return
    }

    const ordered = [...tasks.value].sort((a, b) => a.manualOrder - b.manualOrder)
    const fromIndex = ordered.findIndex((item) => item.id === draggedTaskId)
    const toIndex = ordered.findIndex((item) => item.id === targetTaskId)

    if (fromIndex === -1 || toIndex === -1) {
      return
    }

    const draggedTask = ordered[fromIndex]
    if (!draggedTask) {
      return
    }

    ordered.splice(fromIndex, 1)
    const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
    ordered.splice(insertIndex, 0, draggedTask)

    tasks.value = ordered.map((item, index) => ({
      ...item,
      manualOrder: index + 1,
      updatedAt: item.id === draggedTaskId ? nowIso() : item.updatedAt,
    }))

    filters.sortBy = 'manual'
  }

  function dueStatus(task: Task): 'none' | 'overdue' | 'today' | 'tomorrow' | 'week' {
    if (!task.dueDate || task.completed) {
      return 'none'
    }

    const diff = dayDiffFromToday(task.dueDate)
    if (diff < 0) return 'overdue'
    if (diff === 0) return 'today'
    if (diff === 1) return 'tomorrow'
    if (diff <= 7) return 'week'
    return 'none'
  }

  function dueHint(task: Task): string | null {
    const status = dueStatus(task)
    if (status === 'none') {
      return null
    }

    if (status === 'overdue') {
      return '已逾期'
    }

    if (status === 'today') {
      return '今天到期'
    }

    if (status === 'tomorrow') {
      return '明天到期'
    }

    return '7 天内到期'
  }

  const projectNameById = computed(() => {
    const map = new Map<string, string>()
    for (const project of projects.value) {
      map.set(project.id, project.name)
    }
    return map
  })

  const visibleTasks = computed(() => {
    let list = [...tasks.value]
    const search = filters.search.trim().toLowerCase()

    if (search) {
      list = list.filter((item) => {
        const haystack = `${item.title} ${item.description} ${item.subtasks.map((sub) => sub.text).join(' ')}`.toLowerCase()
        return haystack.includes(search)
      })
    }

    if (filters.status === 'active') {
      list = list.filter((item) => !item.completed)
    } else if (filters.status === 'completed') {
      list = list.filter((item) => item.completed)
    }

    if (filters.priority !== 'all') {
      list = list.filter((item) => item.priority === filters.priority)
    }

    if (filters.projectId !== 'all') {
      list = list.filter((item) => item.projectId === filters.projectId)
    }

    if (filters.due !== 'all') {
      list = list.filter((item) => dueFilterPasses(item, filters.due))
    }

    list.sort(taskComparator(filters.sortBy))
    return list
  })

  const stats = computed(() => {
    const total = tasks.value.length
    const completed = tasks.value.filter((item) => item.completed).length
    const active = total - completed
    const overdue = tasks.value.filter((item) => dueStatus(item) === 'overdue').length
    return { total, active, completed, overdue }
  })

  onMounted(() => {
    loadState()
    syncNotificationPermission()
    maybeSendDueNotifications()

    dueCheckTimer = window.setInterval(() => {
      maybeSendDueNotifications()
    }, 60000)
  })

  onUnmounted(() => {
    if (dueCheckTimer) {
      clearInterval(dueCheckTimer)
      dueCheckTimer = null
    }

    if (snackbarTimer) {
      clearTimeout(snackbarTimer)
      snackbarTimer = null
    }
  })

  watch([tasks, projects], () => {
    persistState()
    const aliveTaskIds = new Set(tasks.value.map((item) => item.id))
    for (const item of [...notifiedTaskIds]) {
      if (!aliveTaskIds.has(item)) {
        notifiedTaskIds.delete(item)
      }
    }
    maybeSendDueNotifications()
  }, { deep: true })

  return {
    tasks,
    projects,
    filters,
    visibleTasks,
    stats,
    selectedTaskIds,
    snackbar,
    defaultProjectId: DEFAULT_PROJECT_ID,
    projectNameById,
    notificationPermission,
    notificationsEnabled,
    addProject,
    removeProject,
    addTask,
    updateTask,
    toggleTaskCompleted,
    deleteTask,
    deleteSelectedTasks,
    toggleTaskSelected,
    clearSelectedTasks,
    addSubtask,
    toggleSubtaskCompleted,
    deleteSubtask,
    reorderTasks,
    dueStatus,
    dueHint,
    undoLastAction,
    toLocalDateTimeInputValue,
    toIsoDate,
    formatDueDate,
    requestNotificationAccess,
  }
}
