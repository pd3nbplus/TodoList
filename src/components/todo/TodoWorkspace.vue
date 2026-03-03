<script setup lang="ts">
import { useTodoWorkspace } from '../../composables/useTodoWorkspace'
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
} = useTodoWorkspace()
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
