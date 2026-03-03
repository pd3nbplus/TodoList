<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import type { Subtask, Task } from '../types/todo'
import { useTodoList } from '../composables/useTodoList'

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

function updateViewportSize() {
  if (!timelineScrollRef.value) {
    return
  }

  viewportHeight.value = timelineScrollRef.value.clientHeight
  viewportWidth.value = timelineScrollRef.value.clientWidth
}

function alignNowToOneThird() {
  const wrap = timelineScrollRef.value
  if (!wrap) return

  const target = nowX.value - wrap.clientWidth / 3
  const maxScroll = Math.max(0, timelineInfo.value.width - wrap.clientWidth)
  wrap.scrollLeft = Math.max(0, Math.min(maxScroll, target))
}

function handleSortByDueDate() {
  const changed = sortTasksByPriorityAndDueDate()
  if (!changed) {
    message.info('任务数量不足，无需排序')
    return
  }

  message.success('已按优先级和截止日期排序')
}

function clearDragPreview(taskId: string, subtaskId: string) {
  const key = getSubtaskKey(taskId, subtaskId)
  delete previewSubtaskX[key]
}

function applyDragPreview() {
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

function onSubtaskPointerMove(event: PointerEvent) {
  if (!dragState.taskId || !dragState.subtaskId) {
    return
  }

  dragPointerX.value = event.clientX
  if (dragRafId !== null) {
    return
  }

  dragRafId = window.requestAnimationFrame(applyDragPreview)
}

function stopSubtaskDrag(commit: boolean) {
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

function onSubtaskPointerUp() {
  stopSubtaskDrag(true)
}

function beginSubtaskDrag(task: Task, subtask: Subtask, event: PointerEvent) {
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

function jumpToHomeByTask(taskId: string, subtaskId?: string) {
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
</script>

<template>
  <div class="roadmap-page">
    <a-card :bordered="false" class="summary-card">
      <div class="summary-head">
        <div>
          <h1>任务路线图</h1>
          <p>横轴为时间顺序，父任务以创建时间定位，子任务以完成/预计完成时间定位。</p>
        </div>
        <a-space wrap>
          <a-tag color="purple">父任务按优先级 + 截止日期排序展示</a-tag>
          <a-tag color="default">灰色：未完成子任务</a-tag>
          <a-tag color="success">绿色：已完成任务/子任务</a-tag>
          <a-button type="primary" @click="handleSortByDueDate">一键按优先级+截止日期排序</a-button>
        </a-space>
      </div>
      <a-alert type="info" show-icon message="本页仅用于查看与规划（支持未完成子任务横向拖拽设置预计完成时间）。" />
    </a-card>

    <a-empty v-if="sortedTasks.length === 0" description="暂无任务可展示" />

    <div v-else ref="timelineScrollRef" class="timeline-scroll">
      <div
        ref="timelineCanvasRef"
        class="timeline-canvas"
        :style="{ width: `${timelineInfo.width}px`, height: `${timelineCanvasHeight}px` }"
      >
        <div class="timeline-body" :style="{ height: `${timelineBodyHeight}px` }">
          <div class="now-line" :style="{ left: `${nowX}px` }">
            <span>当前时间</span>
          </div>

          <div v-for="axis in dueAxes" :key="axis.ms" class="due-axis" :style="{ left: `${axis.x}px` }">
            <span>截止 {{ axis.label }}</span>
          </div>

          <section
            v-for="group in groups"
            :key="group.task.id"
            class="task-group"
            :style="{ top: `${group.top}px`, height: `${group.height}px` }"
          >
            <svg class="links-layer" :width="timelineInfo.width" :height="group.height">
              <defs>
                <marker :id="markerId(group.task.id)" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" :fill="group.task.completed ? '#52c41a' : '#9b59b6'" />
                </marker>
              </defs>

              <line
                v-for="(subtask, idx) in group.task.subtasks"
                :key="subtask.id"
                :x1="xFromIso(group.task.createdAt)"
                :y1="PARENT_Y + 16"
                :x2="getSubtaskTimelineX(group.task, subtask)"
                :y2="subtaskTop(idx) + 14"
                :stroke="group.task.completed ? '#52c41a' : '#9b59b6'"
                stroke-width="2"
                :marker-end="markerUrl(group.task.id)"
              />

              <line
                v-if="dueX(group.task) !== null"
                :x1="xFromIso(group.task.createdAt)"
                :y1="PARENT_Y + 16"
                :x2="dueX(group.task) || 0"
                :y2="PARENT_Y + 16"
                stroke="#ffb3b5"
                stroke-width="1.5"
                stroke-dasharray="4 6"
              />
            </svg>

            <div
              class="parent-node"
              :class="{ done: group.task.completed }"
              :style="{ left: `${xFromIso(group.task.createdAt)}px` }"
              @contextmenu.prevent="jumpToHomeByTask(group.task.id)"
            >
              <strong>{{ group.task.title }}</strong>
              <small>
                创建 {{ formatShortDate(group.task.createdAt) }} ·
                截止 {{ formatShortDate(group.task.dueDate) }}
              </small>
            </div>

            <div
              v-for="(subtask, idx) in group.task.subtasks"
              :key="subtask.id"
              class="subtask-node"
              :class="{
                done: subtask.completed,
                pending: !subtask.completed,
                dragging:
                  dragState.taskId === group.task.id && dragState.subtaskId === subtask.id,
              }"
              :style="{
                left: `${getSubtaskTimelineX(group.task, subtask)}px`,
                top: `${subtaskTop(idx)}px`,
              }"
              @contextmenu.prevent="jumpToHomeByTask(group.task.id, subtask.id)"
              @pointerdown="beginSubtaskDrag(group.task, subtask, $event)"
            >
              <span :title="subtask.text">{{ formatSubtaskNodeText(subtask.text) }}</span>
              <small>
                {{ subtask.completed ? '完成于' : '预计' }}
                {{ formatShortDate(getSubtaskTimelineIso(group.task, subtask)) }}
              </small>
            </div>
          </section>
        </div>

        <div class="timeline-footer">
          <div
            v-for="day in timelineInfo.days"
            :key="day.key"
            class="day-cell"
            :style="{ left: `${day.x}px`, width: `${PX_PER_DAY}px` }"
          >
            <span>{{ day.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roadmap-page {
  height: calc(100vh - 110px);
  min-height: 620px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 12px;
}

.summary-card {
  border-radius: 16px;
}

.summary-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.summary-head h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.summary-head p {
  margin: 0;
  color: #6b5a78;
}

.timeline-scroll {
  border: 1px solid #e6d6f0;
  border-radius: 14px;
  background: #fff;
  overflow: auto;
}

.timeline-canvas {
  position: relative;
}

.timeline-body {
  position: relative;
}

.timeline-footer {
  position: sticky;
  bottom: 0;
  height: 52px;
  background: linear-gradient(180deg, #fbf5ff, #f1e2fa);
  border-top: 1px solid #e7d7f2;
  z-index: 4;
}

.day-cell {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px dashed #f1e8f6;
  display: grid;
  place-items: center;
  color: #6d5a7d;
  font-size: 12px;
}

.now-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    rgba(114, 46, 209, 0.85) 0 14px,
    rgba(114, 46, 209, 0) 14px 20px
  );
  opacity: 0.85;
  z-index: 0;
  pointer-events: none;
}

.now-line span {
  position: absolute;
  left: 6px;
  bottom: 10px;
  white-space: nowrap;
  color: #722ed1;
  font-size: 12px;
  background: #f9f0ff;
  padding: 2px 6px;
  border-radius: 999px;
}

.due-axis {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    rgba(255, 77, 79, 0.72) 0 14px,
    rgba(255, 77, 79, 0) 14px 20px
  );
  z-index: 0;
  pointer-events: none;
}

.due-axis span {
  position: absolute;
  left: 6px;
  bottom: 10px;
  white-space: nowrap;
  color: #cf1322;
  font-size: 11px;
  background: #fff1f0;
  padding: 2px 6px;
  border-radius: 999px;
}

.task-group {
  position: absolute;
  left: 0;
  right: 0;
}

.links-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.parent-node,
.subtask-node {
  position: absolute;
  transform: translateX(-50%);
  min-width: 180px;
  max-width: 240px;
  border-radius: 12px;
  padding: 8px 10px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  z-index: 3;
}

.parent-node {
  top: 12px;
  background: #f9f0ff;
  border: 1px solid #d3adf7;
  color: #531dab;
}

.parent-node.done {
  background: #f6ffed;
  border-color: #95de64;
  color: #237804;
}

.subtask-node {
  cursor: ew-resize;
  transition: box-shadow 0.2s ease;
}

.subtask-node.pending {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  color: #434343;
}

.subtask-node.done {
  background: #f8fff2;
  border: 1px solid #b7eb8f;
  color: #389e0d;
  cursor: default;
}

.subtask-node.dragging {
  box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.22);
}

.parent-node strong,
.subtask-node span {
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}

.parent-node small,
.subtask-node small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.84;
}

@media (max-width: 960px) {
  .roadmap-page {
    height: auto;
    min-height: 560px;
  }

  .summary-head {
    flex-direction: column;
  }
}
</style>
