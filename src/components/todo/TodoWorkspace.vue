<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodoList } from '../../composables/useTodoList'
import type { FilterState, TaskFormInput } from '../../types/todo'
import ProjectSidebar from './ProjectSidebar.vue'
import TaskBulkActions from './TaskBulkActions.vue'
import TaskComposer from './TaskComposer.vue'
import TaskList from './TaskList.vue'
import TaskToolbar from './TaskToolbar.vue'
import TodoHeader from './TodoHeader.vue'
import TodoInsights from './TodoInsights.vue'
import UndoBar from './UndoBar.vue'

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

function handleCreateTask(payload: TaskFormInput) {
  const added = addTask(payload)
  if (!added) {
    message.warning('任务标题不能为空')
  }
}

function handleUpdateTask(payload: { taskId: string; input: TaskFormInput }) {
  const saved = updateTask(payload.taskId, payload.input)
  if (!saved) {
    message.warning('保存失败，请检查任务标题')
  }
}

function handleAddSubtask(payload: { taskId: string; text: string; plannedAt: string }) {
  const added = addSubtask(payload.taskId, payload.text, payload.plannedAt)
  if (!added) {
    message.warning('子任务内容不能为空')
  }
}

function handleUpdateSubtaskPlannedAt(payload: { taskId: string; subtaskId: string; plannedAt: string }) {
  const saved = setSubtaskPlannedAt(payload.taskId, payload.subtaskId, toIsoDate(payload.plannedAt))
  if (saved) {
    message.success('已更新子任务预计完成时间')
  }
}

function handleUpdateSubtaskText(payload: { taskId: string; subtaskId: string; text: string }) {
  const saved = setSubtaskText(payload.taskId, payload.subtaskId, payload.text)
  if (saved) {
    message.success('已更新子任务名称')
    return
  }
  message.warning('子任务内容不能为空')
}

function handleAddProject(name: string) {
  const created = addProject(name)
  if (!created) {
    message.warning('清单名称不能为空或已存在')
  }
}

function handleUpdateFilters(patch: Partial<FilterState>) {
  Object.assign(filters, patch)
}

function selectAllVisible() {
  selectedTaskIds.value = visibleTasks.value.map((item) => item.id)
}

function locateQueryValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function clearLocateQuery() {
  if (!route.query.taskId && !route.query.subtaskId) {
    return
  }

  const nextQuery = { ...route.query }
  delete nextQuery.taskId
  delete nextQuery.subtaskId
  void router.replace({ query: nextQuery })
}

function highlightLocatedElement(element: HTMLElement) {
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

async function locateFromRouteQuery() {
  if (route.name !== 'home') {
    return
  }

  const taskId = locateQueryValue(route.query.taskId)
  if (!taskId) {
    return
  }

  const subtaskId = locateQueryValue(route.query.subtaskId)

  // Ensure target is visible before trying to scroll to it.
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

  {
    message.warning('未找到目标任务，可能已被删除')
    clearLocateQuery()
  }
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
</script>

<template>
  <div class="todo-page">
    <div class="glow glow-left"></div>
    <div class="glow glow-right"></div>

    <div class="workspace">
      <div class="content-grid">
        <div class="left-rail">
          <TodoHeader :stats="stats" />
          <ProjectSidebar
            :projects="projects"
            :selected-project-id="filters.projectId"
            :default-project-id="defaultProjectId"
            :notification-permission="notificationPermission"
            @add-project="handleAddProject"
            @select-project="(projectId) => (filters.projectId = projectId)"
            @remove-project="removeProject"
            @request-notification="requestNotificationAccess"
          />
        </div>

        <div class="main-stack">
          <TaskComposer
            :projects="projects"
            :default-project-id="defaultProjectId"
            @create-task="handleCreateTask"
          />

          <TaskToolbar :filters="filters" @update-filters="handleUpdateFilters" />

          <TaskBulkActions
            :selected-count="selectedCount"
            @delete-selected="deleteSelectedTasks"
            @clear-selected="clearSelectedTasks"
            @select-all-visible="selectAllVisible"
          />

          <TaskList
            :tasks="visibleTasks"
            :projects="projects"
            :selected-task-ids="selectedTaskIds"
            :project-name-by-id="projectNameById"
            :format-due-date="formatDueDate"
            :due-status="dueStatus"
            :due-hint="dueHint"
            :to-local-date-time-input-value="toLocalDateTimeInputValue"
            @toggle-task-selected="toggleTaskSelected"
            @toggle-task-completed="({ taskId, completed }) => setTaskCompleted(taskId, completed)"
            @delete-task="deleteTask"
            @update-task="handleUpdateTask"
            @add-subtask="handleAddSubtask"
            @update-subtask-text="handleUpdateSubtaskText"
            @update-subtask-planned-at="handleUpdateSubtaskPlannedAt"
            @toggle-subtask-completed="({ taskId, subtaskId }) => toggleSubtaskCompleted(taskId, subtaskId)"
            @delete-subtask="({ taskId, subtaskId }) => deleteSubtask(taskId, subtaskId)"
            @reorder-tasks="({ draggedTaskId, targetTaskId }) => reorderTasks(draggedTaskId, targetTaskId)"
          />
        </div>

        <div class="right-rail">
          <TodoInsights :insights="insights" />
        </div>
      </div>
    </div>

    <UndoBar :message="snackbar?.message ?? null" @undo="undoLastAction" />
  </div>
</template>

<style scoped>
.todo-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #f3e8fa, #fcf9fe 44%, #f7eefc 100%);
  padding: 20px 14px 64px;
  position: relative;
  overflow: hidden;
}

:deep(.app-layout.dark-mode .todo-page) {
  background: radial-gradient(circle at top, #1f2532, #151d29 46%, #101722 100%);
}

:deep(.app-layout.dark-mode .todo-page .ant-card) {
  border: 1px solid #2a3445;
  box-shadow: none;
}

:deep(.app-layout.dark-mode .todo-page .ant-card .ant-card-body) {
  background: #171f2c;
  color: #e7edf7;
}

:deep(.app-layout.dark-mode .todo-page .ant-card .ant-card-head) {
  background: #171f2c;
  border-bottom-color: #2a3445;
}

.glow {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.48;
  pointer-events: none;
}

.glow-left {
  background: #c39bd3;
  left: -180px;
  top: -160px;
}

.glow-right {
  background: #f5b7b1;
  right: -180px;
  top: -120px;
}

.workspace {
  width: 85%;
  max-width: 1680px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(240px, 23fr) minmax(0, 54fr) minmax(240px, 23fr);
  align-items: start;
  gap: 12px;
}

.left-rail {
  display: grid;
  gap: 12px;
  align-content: start;
}

.right-rail {
  display: grid;
  align-content: start;
  min-width: 0;
}

.main-stack {
  display: grid;
  gap: 12px;
  min-width: 0;
}

@media (max-width: 1400px) {
  .workspace {
    width: 90%;
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: minmax(220px, 35fr) minmax(0, 65fr);
  }

  .right-rail {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .workspace {
    width: 100%;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
<style scoped>
.todo-page :deep(.locate-flash) {
  animation: locatePulse 1.8s ease-out;
}

@keyframes locatePulse {
  0% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.5);
    background: rgba(82, 196, 26, 0.16);
  }
  100% {
    box-shadow: 0 0 0 16px rgba(82, 196, 26, 0);
    background: transparent;
  }
}
</style>
