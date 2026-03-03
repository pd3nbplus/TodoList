import { computed, nextTick, onBeforeUnmount, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQueryValue } from 'vue-router'
import { useTodoList } from './useTodoList'
import type { FilterState, TaskFormInput } from '../types/todo'

type TodoListApi = ReturnType<typeof useTodoList>

type UseTodoWorkspaceResult = Pick<
  TodoListApi,
  | 'tasks'
  | 'projects'
  | 'filters'
  | 'visibleTasks'
  | 'stats'
  | 'insights'
  | 'selectedTaskIds'
  | 'snackbar'
  | 'defaultProjectId'
  | 'projectNameById'
  | 'notificationPermission'
  | 'removeProject'
  | 'setTaskCompleted'
  | 'deleteTask'
  | 'deleteSelectedTasks'
  | 'toggleTaskSelected'
  | 'clearSelectedTasks'
  | 'toggleSubtaskCompleted'
  | 'deleteSubtask'
  | 'reorderTasks'
  | 'dueStatus'
  | 'dueHint'
  | 'undoLastAction'
  | 'formatDueDate'
  | 'requestNotificationAccess'
  | 'toLocalDateTimeInputValue'
> & {
  selectedCount: ComputedRef<number>
  handleCreateTask: (payload: TaskFormInput) => void
  handleUpdateTask: (payload: { taskId: string; input: TaskFormInput }) => void
  handleAddSubtask: (payload: { taskId: string; text: string; plannedAt: string }) => void
  handleUpdateSubtaskPlannedAt: (payload: { taskId: string; subtaskId: string; plannedAt: string }) => void
  handleUpdateSubtaskText: (payload: { taskId: string; subtaskId: string; text: string }) => void
  handleAddProject: (name: string) => void
  handleUpdateFilters: (patch: Partial<FilterState>) => void
  selectAllVisible: () => void
}

const createTodoWorkspace = (): UseTodoWorkspaceResult => {
  const {
    tasks,
    projects,
    filters,
    visibleTasks,
    stats,
    insights,
    selectedTaskIds,
    snackbar,
    defaultProjectId,
    projectNameById,
    notificationPermission,
    addProject,
    removeProject,
    addTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
    deleteSelectedTasks,
    toggleTaskSelected,
    clearSelectedTasks,
    addSubtask,
    toggleSubtaskCompleted,
    setSubtaskPlannedAt,
    setSubtaskText,
    deleteSubtask,
    reorderTasks,
    dueStatus,
    dueHint,
    undoLastAction,
    formatDueDate,
    requestNotificationAccess,
    toLocalDateTimeInputValue,
    toIsoDate,
  } = useTodoList()

  const selectedCount = computed(() => selectedTaskIds.value.length)
  const route = useRoute()
  const router = useRouter()
  let locateHighlightTimer: number | null = null

  function handleCreateTask(payload: TaskFormInput): void {
    const added = addTask(payload)
    if (!added) {
      message.warning('任务标题不能为空')
    }
  }

  function handleUpdateTask(payload: { taskId: string; input: TaskFormInput }): void {
    const saved = updateTask(payload.taskId, payload.input)
    if (!saved) {
      message.warning('保存失败，请检查任务标题')
    }
  }

  function handleAddSubtask(payload: { taskId: string; text: string; plannedAt: string }): void {
    const added = addSubtask(payload.taskId, payload.text, payload.plannedAt)
    if (!added) {
      message.warning('子任务内容不能为空')
    }
  }

  function handleUpdateSubtaskPlannedAt(payload: { taskId: string; subtaskId: string; plannedAt: string }): void {
    const saved = setSubtaskPlannedAt(payload.taskId, payload.subtaskId, toIsoDate(payload.plannedAt))
    if (saved) {
      message.success('已更新子任务预计完成时间')
    }
  }

  function handleUpdateSubtaskText(payload: { taskId: string; subtaskId: string; text: string }): void {
    const saved = setSubtaskText(payload.taskId, payload.subtaskId, payload.text)
    if (saved) {
      message.success('已更新子任务名称')
      return
    }
    message.warning('子任务内容不能为空')
  }

  function handleAddProject(name: string): void {
    const created = addProject(name)
    if (!created) {
      message.warning('清单名称不能为空或已存在')
    }
  }

  function handleUpdateFilters(patch: Partial<FilterState>): void {
    Object.assign(filters, patch)
  }

  function selectAllVisible(): void {
    selectedTaskIds.value = visibleTasks.value.map((item) => item.id)
  }

  function locateQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string | null {
    if (Array.isArray(value)) {
      const first = value[0]
      return typeof first === 'string' && first.trim() ? first : null
    }

    return typeof value === 'string' && value.trim() ? value : null
  }

  function clearLocateQuery(): void {
    if (!route.query.taskId && !route.query.subtaskId) {
      return
    }

    const nextQuery = { ...route.query }
    delete nextQuery.taskId
    delete nextQuery.subtaskId
    void router.replace({ query: nextQuery })
  }

  function highlightLocatedElement(element: HTMLElement): void {
    if (locateHighlightTimer !== null) {
      window.clearTimeout(locateHighlightTimer)
      locateHighlightTimer = null
    }

    element.classList.remove('locate-flash')
    void element.offsetWidth
    element.classList.add('locate-flash')
    locateHighlightTimer = window.setTimeout(() => {
      element.classList.remove('locate-flash')
      locateHighlightTimer = null
    }, 1800)
  }

  async function locateFromRouteQuery(): Promise<void> {
    if (route.name !== 'home') {
      return
    }

    const taskId = locateQueryValue(route.query.taskId)
    if (!taskId) {
      return
    }

    const subtaskId = locateQueryValue(route.query.subtaskId)

    Object.assign(filters, {
      search: '',
      status: 'all',
      priority: 'all',
      projectId: 'all',
      due: 'all',
    } satisfies Partial<FilterState>)

    await nextTick()
    await nextTick()

    const targetId = subtaskId ? `subtask-item-${taskId}-${subtaskId}` : `task-item-${taskId}`
    const fallbackTaskId = `task-item-${taskId}`
    const target =
      document.getElementById(targetId) ??
      (subtaskId ? document.getElementById(fallbackTaskId) : null)

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightLocatedElement(target)
      clearLocateQuery()
      return
    }

    if (tasks.value.length === 0) {
      return
    }

    if (targetId !== fallbackTaskId) {
      const taskOnlyTarget = document.getElementById(fallbackTaskId)
      if (taskOnlyTarget) {
        taskOnlyTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
        highlightLocatedElement(taskOnlyTarget)
        clearLocateQuery()
        return
      }
    }

    message.warning('未找到目标任务，可能已被删除')
    clearLocateQuery()
  }

  watch(
    () => [route.name, route.query.taskId, route.query.subtaskId, tasks.value.length],
    () => {
      void locateFromRouteQuery()
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (locateHighlightTimer !== null) {
      window.clearTimeout(locateHighlightTimer)
      locateHighlightTimer = null
    }
  })

  return {
    tasks,
    projects,
    filters,
    visibleTasks,
    stats,
    insights,
    selectedTaskIds,
    snackbar,
    defaultProjectId,
    projectNameById,
    notificationPermission,
    selectedCount,
    removeProject,
    setTaskCompleted,
    deleteTask,
    deleteSelectedTasks,
    toggleTaskSelected,
    clearSelectedTasks,
    toggleSubtaskCompleted,
    deleteSubtask,
    reorderTasks,
    dueStatus,
    dueHint,
    undoLastAction,
    formatDueDate,
    requestNotificationAccess,
    toLocalDateTimeInputValue,
    handleCreateTask,
    handleUpdateTask,
    handleAddSubtask,
    handleUpdateSubtaskPlannedAt,
    handleUpdateSubtaskText,
    handleAddProject,
    handleUpdateFilters,
    selectAllVisible,
  }
}

export const useTodoWorkspace: typeof createTodoWorkspace = createTodoWorkspace
