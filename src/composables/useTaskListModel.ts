import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { ComponentPublicInstance, ComputedRef, Ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import type { Project, Task, TaskFormInput, TaskPriority } from '../types/todo'

export interface TaskListProps {
  tasks: Task[]
  projects: Project[]
  selectedTaskIds: string[]
  projectNameById: Map<string, string>
  formatDueDate: (value: string | null) => string
  dueStatus: (task: Task) => 'none' | 'overdue' | 'today' | 'tomorrow' | 'week'
  dueHint: (task: Task) => string | null
  toLocalDateTimeInputValue: (value: string | null) => string
}

export type TaskListEmit = {
  (event: 'toggleTaskSelected', taskId: string): void
  (event: 'toggleTaskCompleted', payload: { taskId: string; completed: boolean }): void
  (event: 'deleteTask', taskId: string): void
  (event: 'updateTask', payload: { taskId: string; input: TaskFormInput }): void
  (event: 'addSubtask', payload: { taskId: string; text: string; plannedAt: string }): void
  (event: 'updateSubtaskText', payload: { taskId: string; subtaskId: string; text: string }): void
  (event: 'updateSubtaskPlannedAt', payload: { taskId: string; subtaskId: string; plannedAt: string }): void
  (event: 'toggleSubtaskCompleted', payload: { taskId: string; subtaskId: string }): void
  (event: 'deleteSubtask', payload: { taskId: string; subtaskId: string }): void
  (event: 'reorderTasks', payload: { draggedTaskId: string; targetTaskId: string }): void
}

export interface TaskListModelResult {
  editingTaskId: Ref<string | null>
  dragTaskId: Ref<string | null>
  dragOverTaskId: Ref<string | null>
  subtaskDrafts: Record<string, string>
  subtaskPlanDrafts: Record<string, string>
  subtaskTextDrafts: Record<string, string>
  editingSubtaskTextKey: Ref<string | null>
  editingSubtaskPlanKey: Ref<string | null>
  editForm: TaskFormInput
  priorityOptions: Array<{ value: TaskPriority; label: string }>
  projectOptions: ComputedRef<Array<{ value: string; label: string }>>
  beginEdit: (task: Task) => void
  saveEdit: (taskId: string) => void
  cancelEdit: () => void
  handleTaskSpaceToggle: (task: Task, event: KeyboardEvent) => void
  handleTaskSelectedChange: (taskId: string) => void
  handleTaskCompletedChange: (task: Task) => void
  confirmToggleTaskCompleted: (task: Task) => void
  handleAddSubtask: (taskId: string) => void
  subtaskPlanKey: (taskId: string, subtaskId: string) => string
  getSubtaskPlanDraft: (taskId: string, subtaskId: string, plannedAt: string | null) => string
  getSubtaskTextDraft: (taskId: string, subtaskId: string, text: string) => string
  handleSubtaskTextDraftChange: (taskId: string, subtaskId: string, value: string) => void
  beginEditSubtaskText: (taskId: string, subtaskId: string, text: string) => void
  cancelEditSubtaskText: () => void
  handleUpdateSubtaskText: (taskId: string, subtaskId: string) => void
  handleSubtaskPlanDraftChange: (taskId: string, subtaskId: string, value: string) => void
  handleUpdateSubtaskPlannedAt: (taskId: string, subtaskId: string) => void
  beginEditSubtaskPlannedAt: (taskId: string, subtaskId: string, plannedAt: string | null) => void
  setSubtaskPlanEditorRef: (key: string, el: Element | ComponentPublicInstance | null) => void
  resetDragState: () => void
  handleDragStart: (taskId: string, event: DragEvent) => void
  handleDrop: (targetTaskId: string) => void
  setTaskItemRef: (index: number, el: Element | ComponentPublicInstance | null) => void
  registerTaskVisibilityHandler: (handler: ((index: number) => void) | null) => void
  handleTaskArrowNavigation: (index: number, step: number, event: KeyboardEvent) => void
  handleTaskTabNavigation: (index: number, event: KeyboardEvent) => void
  formatPlannedDate: (iso: string | null) => string
  copySubtaskText: (text: string) => Promise<void>
}

const createTaskListModel = (props: TaskListProps, emit: TaskListEmit): TaskListModelResult => {
  const editingTaskId = ref<string | null>(null)
  const dragTaskId = ref<string | null>(null)
  const dragOverTaskId = ref<string | null>(null)
  const subtaskDrafts = reactive<Record<string, string>>({})
  const subtaskPlanDrafts = reactive<Record<string, string>>({})
  const subtaskTextDrafts = reactive<Record<string, string>>({})
  const editingSubtaskTextKey = ref<string | null>(null)
  const editingSubtaskPlanKey = ref<string | null>(null)
  const subtaskPlanEditorRefs = reactive<Record<string, HTMLElement | null>>({})
  const taskItemRefs = ref<Array<HTMLElement | null>>([])
  const taskVisibilityHandler = ref<((index: number) => void) | null>(null)

  const editForm = reactive<TaskFormInput>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    projectId: '',
  })

  const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'low', label: '低' },
  ]

  const projectOptions = computed(() =>
    props.projects.map((project) => ({ value: project.id, label: project.name })),
  )

  function beginEdit(task: Task): void {
    editingTaskId.value = task.id
    editForm.title = task.title
    editForm.description = task.description
    editForm.dueDate = props.toLocalDateTimeInputValue(task.dueDate)
    editForm.priority = task.priority
    editForm.projectId = task.projectId
  }

  function saveEdit(taskId: string): void {
    if (!editForm.title.trim()) {
      return
    }

    emit('updateTask', {
      taskId,
      input: {
        title: editForm.title,
        description: editForm.description,
        dueDate: editForm.dueDate,
        priority: editForm.priority,
        projectId: editForm.projectId,
      },
    })
    editingTaskId.value = null
  }

  function cancelEdit(): void {
    editingTaskId.value = null
  }

  function handleTaskSpaceToggle(task: Task, event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null
    if (!target) {
      return
    }

    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) {
      return
    }

    confirmToggleTaskCompleted(task)
  }

  function handleTaskSelectedChange(taskId: string): void {
    emit('toggleTaskSelected', taskId)
  }

  function handleTaskCompletedChange(task: Task): void {
    confirmToggleTaskCompleted(task)
  }

  function confirmToggleTaskCompleted(task: Task): void {
    const nextCompleted = !task.completed
    Modal.confirm({
      title: nextCompleted ? '确认完成任务？' : '确认恢复任务？',
      content: nextCompleted
        ? '确认后将把该任务及其所有子任务标记为完成。'
        : '确认后将把该任务及其所有子任务恢复为未完成。',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        emit('toggleTaskCompleted', {
          taskId: task.id,
          completed: nextCompleted,
        })
      },
    })
  }

  function handleAddSubtask(taskId: string): void {
    const text = (subtaskDrafts[taskId] ?? '').trim()
    if (!text) {
      return
    }

    emit('addSubtask', {
      taskId,
      text,
      plannedAt: subtaskPlanDrafts[taskId] || '',
    })
    subtaskDrafts[taskId] = ''
    subtaskPlanDrafts[taskId] = ''
  }

  function subtaskPlanKey(taskId: string, subtaskId: string): string {
    return `${taskId}:${subtaskId}`
  }

  function getSubtaskPlanDraft(taskId: string, subtaskId: string, plannedAt: string | null): string {
    const key = subtaskPlanKey(taskId, subtaskId)
    if (subtaskPlanDrafts[key] === undefined) {
      subtaskPlanDrafts[key] = props.toLocalDateTimeInputValue(plannedAt)
    }

    return subtaskPlanDrafts[key] ?? ''
  }

  function setSubtaskPlanDraft(taskId: string, subtaskId: string, value: string): void {
    const key = subtaskPlanKey(taskId, subtaskId)
    subtaskPlanDrafts[key] = value
  }

  function getSubtaskTextDraft(taskId: string, subtaskId: string, text: string): string {
    const key = subtaskPlanKey(taskId, subtaskId)
    if (subtaskTextDrafts[key] === undefined) {
      subtaskTextDrafts[key] = text
    }
    return subtaskTextDrafts[key] ?? ''
  }

  function handleSubtaskTextDraftChange(taskId: string, subtaskId: string, value: string): void {
    const key = subtaskPlanKey(taskId, subtaskId)
    subtaskTextDrafts[key] = value
  }

  function beginEditSubtaskText(taskId: string, subtaskId: string, text: string): void {
    const key = subtaskPlanKey(taskId, subtaskId)
    subtaskTextDrafts[key] = text
    editingSubtaskTextKey.value = key
  }

  function cancelEditSubtaskText(): void {
    const key = editingSubtaskTextKey.value
    if (!key) {
      return
    }

    delete subtaskTextDrafts[key]
    editingSubtaskTextKey.value = null
  }

  function handleUpdateSubtaskText(taskId: string, subtaskId: string): void {
    const key = subtaskPlanKey(taskId, subtaskId)
    const text = (subtaskTextDrafts[key] ?? '').trim()
    if (!text) {
      message.warning('子任务内容不能为空')
      return
    }

    emit('updateSubtaskText', {
      taskId,
      subtaskId,
      text,
    })
    delete subtaskTextDrafts[key]
    editingSubtaskTextKey.value = null
  }

  function handleSubtaskPlanDraftChange(taskId: string, subtaskId: string, value: string): void {
    setSubtaskPlanDraft(taskId, subtaskId, value)
  }

  function handleUpdateSubtaskPlannedAt(taskId: string, subtaskId: string): void {
    const key = subtaskPlanKey(taskId, subtaskId)
    emit('updateSubtaskPlannedAt', {
      taskId,
      subtaskId,
      plannedAt: subtaskPlanDrafts[key] || '',
    })
    editingSubtaskPlanKey.value = null
    delete subtaskPlanDrafts[key]
  }

  function beginEditSubtaskPlannedAt(taskId: string, subtaskId: string, plannedAt: string | null): void {
    const key = subtaskPlanKey(taskId, subtaskId)
    subtaskPlanDrafts[key] = props.toLocalDateTimeInputValue(plannedAt)
    editingSubtaskPlanKey.value = key
  }

  function cancelEditSubtaskPlannedAt(): void {
    const key = editingSubtaskPlanKey.value
    if (!key) {
      return
    }

    delete subtaskPlanDrafts[key]
    editingSubtaskPlanKey.value = null
  }

  function setSubtaskPlanEditorRef(key: string, el: Element | ComponentPublicInstance | null): void {
    if (el && '$el' in el) {
      subtaskPlanEditorRefs[key] = (el.$el as HTMLElement | null) ?? null
      return
    }

    subtaskPlanEditorRefs[key] = (el as HTMLElement | null) ?? null
  }

  function handlePagePointerDown(event: MouseEvent): void {
    const key = editingSubtaskPlanKey.value
    if (!key) {
      return
    }

    const editor = subtaskPlanEditorRefs[key]
    const target = event.target as Node | null
    if (editor && target && editor.contains(target)) {
      return
    }

    cancelEditSubtaskPlannedAt()
  }

  function resetDragState(): void {
    dragTaskId.value = null
    dragOverTaskId.value = null
  }

  function handleDragStart(taskId: string, event: DragEvent): void {
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        'input,button,textarea,select,a,label,.ant-checkbox,.ant-checkbox-wrapper,.ant-input,.ant-input-affix-wrapper,.ant-input-group-wrapper,.subtask-plan-editor,.subtask-text-editor',
      )
    ) {
      event.preventDefault()
      return
    }

    dragTaskId.value = taskId
  }

  function handleDrop(targetTaskId: string): void {
    if (!dragTaskId.value || dragTaskId.value === targetTaskId) {
      resetDragState()
      return
    }

    emit('reorderTasks', { draggedTaskId: dragTaskId.value, targetTaskId })
    resetDragState()
  }

  function setTaskItemRef(index: number, el: Element | ComponentPublicInstance | null): void {
    if (el && '$el' in el) {
      taskItemRefs.value[index] = (el.$el as HTMLElement | null) ?? null
      return
    }

    taskItemRefs.value[index] = (el as HTMLElement | null) ?? null
  }

  function registerTaskVisibilityHandler(handler: ((index: number) => void) | null): void {
    taskVisibilityHandler.value = handler
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false
    }

    return Boolean(
      target.closest('input,textarea,select,button,a,label,.ant-checkbox-wrapper,.ant-input,.ant-select'),
    )
  }

  function focusTaskByIndex(index: number): void {
    const el = taskItemRefs.value[index]
    if (el) {
      el.focus()
      return
    }

    taskVisibilityHandler.value?.(index)
    window.setTimeout(() => {
      const fallback = document.querySelector<HTMLElement>(`[data-task-index="${index}"]`)
      fallback?.focus()
    }, 0)
  }

  function handleTaskArrowNavigation(index: number, step: number, event: KeyboardEvent): void {
    if (isInteractiveTarget(event.target)) {
      return
    }

    const nextIndex = index + step
    if (nextIndex < 0 || nextIndex >= props.tasks.length) {
      return
    }

    event.preventDefault()
    focusTaskByIndex(nextIndex)
  }

  function handleTaskTabNavigation(index: number, event: KeyboardEvent): void {
    if (isInteractiveTarget(event.target)) {
      return
    }

    const step = event.shiftKey ? -1 : 1
    const nextIndex = index + step
    if (nextIndex < 0 || nextIndex >= props.tasks.length) {
      return
    }

    event.preventDefault()
    focusTaskByIndex(nextIndex)
  }

  function formatPlannedDate(iso: string | null): string {
    if (!iso) {
      return '无预计完成时间'
    }

    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return '无预计完成时间'
    }

    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  function fallbackCopyText(text: string): boolean {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  }

  async function copySubtaskText(text: string): Promise<void> {
    const content = text.trim()
    if (!content) {
      message.warning('子任务名称为空，无法复制')
      return
    }

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(content)
        message.success('已复制子任务名称')
        return
      }

      const copied = fallbackCopyText(content)
      if (!copied) {
        throw new Error('fallback copy failed')
      }
      message.success('已复制子任务名称')
    }
    catch {
      message.error('复制失败，请手动复制')
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', handlePagePointerDown)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handlePagePointerDown)
  })

  return {
    editingTaskId,
    dragTaskId,
    dragOverTaskId,
    subtaskDrafts,
    subtaskPlanDrafts,
    subtaskTextDrafts,
    editingSubtaskTextKey,
    editingSubtaskPlanKey,
    editForm,
    priorityOptions,
    projectOptions,
    beginEdit,
    saveEdit,
    cancelEdit,
    handleTaskSpaceToggle,
    handleTaskSelectedChange,
    handleTaskCompletedChange,
    confirmToggleTaskCompleted,
    handleAddSubtask,
    subtaskPlanKey,
    getSubtaskPlanDraft,
    getSubtaskTextDraft,
    handleSubtaskTextDraftChange,
    beginEditSubtaskText,
    cancelEditSubtaskText,
    handleUpdateSubtaskText,
    handleSubtaskPlanDraftChange,
    handleUpdateSubtaskPlannedAt,
    beginEditSubtaskPlannedAt,
    setSubtaskPlanEditorRef,
    resetDragState,
    handleDragStart,
    handleDrop,
    setTaskItemRef,
    registerTaskVisibilityHandler,
    handleTaskArrowNavigation,
    handleTaskTabNavigation,
    formatPlannedDate,
    copySubtaskText,
  }
}

export const useTaskListModel: typeof createTaskListModel = createTaskListModel
