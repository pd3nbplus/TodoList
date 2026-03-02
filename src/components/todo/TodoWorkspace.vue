<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
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
</script>

<template>
  <div class="todo-page">
    <div class="glow glow-left"></div>
    <div class="glow glow-right"></div>

    <div class="workspace">
      <TodoHeader :stats="stats" />
      <TodoInsights :insights="insights" />

      <div class="content-grid">
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
            @update-subtask-planned-at="handleUpdateSubtaskPlannedAt"
            @toggle-subtask-completed="({ taskId, subtaskId }) => toggleSubtaskCompleted(taskId, subtaskId)"
            @delete-subtask="({ taskId, subtaskId }) => deleteSubtask(taskId, subtaskId)"
            @reorder-tasks="({ draggedTaskId, targetTaskId }) => reorderTasks(draggedTaskId, targetTaskId)"
          />
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
  max-width: 1280px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 12px;
}

.main-stack {
  display: grid;
  gap: 12px;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
