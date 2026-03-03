import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import type { Subtask, Task } from '../types/todo'
import { useTodoList } from './useTodoList'

const DAY_MS = 24 * 60 * 60 * 1000
const PX_PER_DAY = 120
const FOOTER_HEIGHT = 52
const PARENT_Y = 26
const SUBTASK_START_Y = 88
const SUBTASK_GAP = 46
const GROUP_GAP = 18
const SUBTASK_TEXT_MAX_LENGTH = 10
const PRIORITY_ORDER: Record<Task['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
}

interface TimelineGroup {
  task: Task
  top: number
  height: number
}

interface TimelineDay {
  key: string
  ms: number
  x: number
  label: string
}

interface TimelineInfo {
  startMs: number
  width: number
  days: TimelineDay[]
}

interface DueAxis {
  ms: number
  x: number
  label: string
}

type UseTodoTimelineResult = {
  sortedTasks: ComputedRef<Task[]>
  timelineScrollRef: Ref<HTMLElement | null>
  timelineCanvasRef: Ref<HTMLElement | null>
  timelineInfo: ComputedRef<TimelineInfo>
  timelineCanvasHeight: ComputedRef<number>
  timelineBodyHeight: ComputedRef<number>
  dueAxes: ComputedRef<DueAxis[]>
  groups: ComputedRef<TimelineGroup[]>
  nowX: ComputedRef<number>
  dragState: { taskId: string | null; subtaskId: string | null }
  PARENT_Y: number
  PX_PER_DAY: number
  xFromIso: (iso: string | null) => number
  getSubtaskTimelineX: (task: Task, subtask: Subtask) => number
  dueX: (task: Task) => number | null
  markerId: (taskId: string) => string
  markerUrl: (taskId: string) => string
  subtaskTop: (index: number) => number
  formatShortDate: (iso: string | null) => string
  getSubtaskTimelineIso: (task: Task, subtask: Subtask) => string
  formatSubtaskNodeText: (text: string) => string
  handleSortByDueDate: () => void
  jumpToHomeByTask: (taskId: string, subtaskId?: string) => void
  beginSubtaskDrag: (task: Task, subtask: Subtask, event: PointerEvent) => void
}

const createTodoTimeline = (): UseTodoTimelineResult => {
  const {
    tasks,
    sortTasksByPriorityAndDueDate,
    setSubtaskPlannedAt,
  } = useTodoList()

  const timelineScrollRef = ref<HTMLElement | null>(null)
  const timelineCanvasRef = ref<HTMLElement | null>(null)
  const viewportHeight = ref(420)
  const viewportWidth = ref(960)
  const router = useRouter()

  let resizeObserver: ResizeObserver | null = null

  const dragState = reactive<{
    taskId: string | null
    subtaskId: string | null
  }>({
    taskId: null,
    subtaskId: null,
  })

  const previewSubtaskX = reactive<Record<string, number>>({})
  const dragPointerX = ref<number | null>(null)
  let dragRafId: number | null = null

  const sortedTasks = computed(() => {
    return [...tasks.value].sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
      if (priorityDiff !== 0) {
        return priorityDiff
      }

      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY
      if (aDue !== bDue) {
        return aDue - bDue
      }

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })

  function startOfDayMs(iso: string): number {
    const date = new Date(iso)
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  }

  const timeBoundary = computed(() => {
    const points: number[] = [Date.now()]

    for (const task of sortedTasks.value) {
      points.push(startOfDayMs(task.createdAt))

      if (task.dueDate) {
        points.push(startOfDayMs(task.dueDate))
      }

      for (const subtask of task.subtasks) {
        if (subtask.completedAt) {
          points.push(startOfDayMs(subtask.completedAt))
        }
        if (subtask.plannedAt) {
          points.push(startOfDayMs(subtask.plannedAt))
        }
      }
    }

    const min = Math.min(...points)
    const max = Math.max(...points)
    return {
      startMs: min - 3 * DAY_MS,
      endMs: max + 3 * DAY_MS,
    }
  })

  const timelineInfo = computed(() => {
    const startMs = timeBoundary.value.startMs
    const endMs = timeBoundary.value.endMs
    const rangeDays = Math.floor((endMs - startMs) / DAY_MS) + 1
    const minDaysByViewport = Math.max(1, Math.floor(viewportWidth.value / PX_PER_DAY))
    const totalDays = Math.max(minDaysByViewport, rangeDays)
    const width = totalDays * PX_PER_DAY

    const days = Array.from({ length: totalDays }, (_, index) => {
      const ms = startMs + index * DAY_MS
      return {
        key: `day-${ms}`,
        ms,
        x: index * PX_PER_DAY,
        label: new Intl.DateTimeFormat('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(ms)),
      }
    })

    return { startMs, width, days }
  })

  function xFromIso(iso: string | null): number {
    if (!iso) {
      return PX_PER_DAY / 2
    }

    const ms = startOfDayMs(iso)
    const offsetDays = (ms - timelineInfo.value.startMs) / DAY_MS
    const x = offsetDays * PX_PER_DAY + PX_PER_DAY / 2
    return Math.max(PX_PER_DAY / 2, Math.min(timelineInfo.value.width - PX_PER_DAY / 2, x))
  }

  function isoFromX(x: number): string {
    const clamped = Math.max(PX_PER_DAY / 2, Math.min(timelineInfo.value.width - PX_PER_DAY / 2, x))
    const dayIndex = Math.round((clamped - PX_PER_DAY / 2) / PX_PER_DAY)
    const ms = timelineInfo.value.startMs + dayIndex * DAY_MS
    return new Date(ms).toISOString()
  }

  function clampX(x: number): number {
    return Math.max(PX_PER_DAY / 2, Math.min(timelineInfo.value.width - PX_PER_DAY / 2, x))
  }

  function getSubtaskKey(taskId: string, subtaskId: string): string {
    return `${taskId}:${subtaskId}`
  }

  function getSubtaskBaseIso(task: Task, subtask: Subtask): string {
    if (subtask.completed) {
      return subtask.completedAt || task.updatedAt || task.createdAt
    }

    return subtask.plannedAt || task.createdAt
  }

  function getSubtaskTimelineX(task: Task, subtask: Subtask): number {
    const key = getSubtaskKey(task.id, subtask.id)
    const previewX = previewSubtaskX[key]
    if (typeof previewX === 'number') {
      return previewX
    }

    return xFromIso(getSubtaskBaseIso(task, subtask))
  }

  function getSubtaskTimelineIso(task: Task, subtask: Subtask): string {
    if (subtask.completed) {
      return subtask.completedAt || task.updatedAt || task.createdAt
    }

    const key = getSubtaskKey(task.id, subtask.id)
    const previewX = previewSubtaskX[key]
    if (typeof previewX === 'number') {
      return isoFromX(previewX)
    }

    return subtask.plannedAt || task.createdAt
  }

  const groups = computed<TimelineGroup[]>(() => {
    let top = 0

    return sortedTasks.value.map((task) => {
      const subtaskHeight = task.subtasks.length > 0 ? SUBTASK_START_Y + task.subtasks.length * SUBTASK_GAP : 120
      const height = Math.max(130, subtaskHeight + 12)
      const group: TimelineGroup = { task, top, height }
      top += height + GROUP_GAP
      return group
    })
  })

  const totalContentHeight = computed(() => {
    if (groups.value.length === 0) {
      return 220
    }

    const last = groups.value[groups.value.length - 1]
    if (!last) {
      return 220
    }

    return last.top + last.height
  })

  const timelineBodyHeight = computed(() => {
    const fitHeight = Math.max(300, viewportHeight.value - FOOTER_HEIGHT)
    return Math.max(totalContentHeight.value, fitHeight)
  })

  const timelineCanvasHeight = computed(() => timelineBodyHeight.value + FOOTER_HEIGHT)

  const dueAxes = computed(() => {
    const map = new Map<number, { ms: number; x: number; label: string }>()

    for (const task of sortedTasks.value) {
      if (!task.dueDate) continue

      const ms = startOfDayMs(task.dueDate)
      if (map.has(ms)) {
        continue
      }

      map.set(ms, {
        ms,
        x: xFromIso(task.dueDate),
        label: new Intl.DateTimeFormat('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(ms)),
      })
    }

    return [...map.values()].sort((a, b) => a.ms - b.ms)
  })

  const nowX = computed(() => xFromIso(new Date().toISOString()))

  function dueX(task: Task): number | null {
    return task.dueDate ? xFromIso(task.dueDate) : null
  }

  function markerId(taskId: string): string {
    return `arrow-${taskId}`
  }

  function markerUrl(taskId: string): string {
    return `url(#${markerId(taskId)})`
  }

  function subtaskTop(index: number): number {
    return SUBTASK_START_Y + index * SUBTASK_GAP
  }

  function formatShortDate(iso: string | null): string {
    if (!iso) return '--'
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '--'
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date)
  }

  function formatSubtaskNodeText(text: string): string {
    const chars = Array.from(text.trim())
    if (chars.length <= SUBTASK_TEXT_MAX_LENGTH) {
      return chars.join('')
    }

    return `${chars.slice(0, SUBTASK_TEXT_MAX_LENGTH).join('')}...`
  }

  function updateViewportSize(): void {
    if (!timelineScrollRef.value) {
      return
    }

    viewportHeight.value = timelineScrollRef.value.clientHeight
    viewportWidth.value = timelineScrollRef.value.clientWidth
  }

  function alignNowToOneThird(): void {
    const wrap = timelineScrollRef.value
    if (!wrap) return

    const target = nowX.value - wrap.clientWidth / 3
    const maxScroll = Math.max(0, timelineInfo.value.width - wrap.clientWidth)
    wrap.scrollLeft = Math.max(0, Math.min(maxScroll, target))
  }

  function handleSortByDueDate(): void {
    const changed = sortTasksByPriorityAndDueDate()
    if (!changed) {
      message.info('任务数量不足，无需排序')
      return
    }

    message.success('已按优先级和截止日期排序')
  }

  function clearDragPreview(taskId: string, subtaskId: string): void {
    const key = getSubtaskKey(taskId, subtaskId)
    delete previewSubtaskX[key]
  }

  function applyDragPreview(): void {
    if (!dragState.taskId || !dragState.subtaskId) {
      dragRafId = null
      return
    }

    const pointerX = dragPointerX.value
    const canvas = timelineCanvasRef.value
    if (pointerX === null || !canvas) {
      dragRafId = null
      return
    }

    const rect = canvas.getBoundingClientRect()
    const key = getSubtaskKey(dragState.taskId, dragState.subtaskId)
    previewSubtaskX[key] = clampX(pointerX - rect.left)
    dragRafId = null
  }

  function onSubtaskPointerMove(event: PointerEvent): void {
    if (!dragState.taskId || !dragState.subtaskId) {
      return
    }

    dragPointerX.value = event.clientX
    if (dragRafId !== null) {
      return
    }

    dragRafId = window.requestAnimationFrame(applyDragPreview)
  }

  function stopSubtaskDrag(commit: boolean): void {
    const taskId = dragState.taskId
    const subtaskId = dragState.subtaskId
    if (!taskId || !subtaskId) {
      return
    }

    const key = getSubtaskKey(taskId, subtaskId)
    const previewX = previewSubtaskX[key]
    const plannedAt = typeof previewX === 'number' ? isoFromX(previewX) : null

    if (commit) {
      const saved = setSubtaskPlannedAt(taskId, subtaskId, plannedAt)
      if (saved) {
        message.success('已设置预计完成时间')
      }
    }

    clearDragPreview(taskId, subtaskId)
    dragState.taskId = null
    dragState.subtaskId = null
    dragPointerX.value = null

    if (dragRafId !== null) {
      window.cancelAnimationFrame(dragRafId)
      dragRafId = null
    }

    window.removeEventListener('pointermove', onSubtaskPointerMove)
    window.removeEventListener('pointerup', onSubtaskPointerUp)
  }

  function onSubtaskPointerUp(): void {
    stopSubtaskDrag(true)
  }

  function beginSubtaskDrag(task: Task, subtask: Subtask, event: PointerEvent): void {
    if (event.button !== 0) {
      return
    }

    if (subtask.completed) {
      return
    }

    event.preventDefault()
    dragState.taskId = task.id
    dragState.subtaskId = subtask.id
    dragPointerX.value = event.clientX
    applyDragPreview()

    window.addEventListener('pointermove', onSubtaskPointerMove)
    window.addEventListener('pointerup', onSubtaskPointerUp)
  }

  function jumpToHomeByTask(taskId: string, subtaskId?: string): void {
    const query = subtaskId
      ? { taskId, subtaskId }
      : { taskId }
    void router.push({ name: 'home', query })
  }

  onMounted(async () => {
    await nextTick()
    updateViewportSize()
    alignNowToOneThird()

    if (typeof ResizeObserver !== 'undefined' && timelineScrollRef.value) {
      resizeObserver = new ResizeObserver(() => {
        updateViewportSize()
      })
      resizeObserver.observe(timelineScrollRef.value)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onSubtaskPointerMove)
    window.removeEventListener('pointerup', onSubtaskPointerUp)
    if (dragRafId !== null) {
      window.cancelAnimationFrame(dragRafId)
      dragRafId = null
    }
    resizeObserver?.disconnect()
  })

  return {
    sortedTasks,
    timelineScrollRef,
    timelineCanvasRef,
    timelineInfo,
    timelineCanvasHeight,
    timelineBodyHeight,
    dueAxes,
    groups,
    nowX,
    dragState,
    PARENT_Y,
    PX_PER_DAY,
    xFromIso,
    getSubtaskTimelineX,
    dueX,
    markerId,
    markerUrl,
    subtaskTop,
    formatShortDate,
    getSubtaskTimelineIso,
    formatSubtaskNodeText,
    handleSortByDueDate,
    jumpToHomeByTask,
    beginSubtaskDrag,
  }
}

export const useTodoTimeline: typeof createTodoTimeline = createTodoTimeline
