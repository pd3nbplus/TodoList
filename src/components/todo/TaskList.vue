<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { CopyOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons-vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import type { Task, TaskFormInput } from '../../types/todo'
import type { TaskListProps } from '../../composables/useTaskListModel'
import { useTaskListModel } from '../../composables/useTaskListModel'
import TaskMetaTags from './TaskMetaTags'

interface TaskListInputProps {
  tasks?: TaskListProps['tasks']
  projects?: TaskListProps['projects']
  selectedTaskIds?: TaskListProps['selectedTaskIds']
  projectNameById?: TaskListProps['projectNameById']
  formatDueDate?: TaskListProps['formatDueDate']
  dueStatus?: TaskListProps['dueStatus']
  dueHint?: TaskListProps['dueHint']
  toLocalDateTimeInputValue?: TaskListProps['toLocalDateTimeInputValue']
}

const props = withDefaults(defineProps<TaskListInputProps>(), {
  tasks: () => [],
  projects: () => [],
  selectedTaskIds: () => [],
  projectNameById: () => new Map<string, string>(),
  formatDueDate: (value: string | null) => value ?? '',
  dueStatus: (task: Task): 'none' => {
    void task
    return 'none'
  },
  dueHint: (task: Task) => {
    void task
    return null
  },
  toLocalDateTimeInputValue: () => '',
})

const emit = defineEmits<{
  toggleTaskSelected: [taskId: string]
  toggleTaskCompleted: [payload: { taskId: string; completed: boolean }]
  deleteTask: [taskId: string]
  updateTask: [payload: { taskId: string; input: TaskFormInput }]
  addSubtask: [payload: { taskId: string; text: string; plannedAt: string }]
  updateSubtaskText: [payload: { taskId: string; subtaskId: string; text: string }]
  updateSubtaskPlannedAt: [payload: { taskId: string; subtaskId: string; plannedAt: string }]
  toggleSubtaskCompleted: [payload: { taskId: string; subtaskId: string }]
  deleteSubtask: [payload: { taskId: string; subtaskId: string }]
  reorderTasks: [payload: { draggedTaskId: string; targetTaskId: string }]
}>()

interface VirtualScrollerInstanceLike {
  scrollToItem?: (index: number) => void
}

const VIRTUAL_SCROLL_THRESHOLD = 50
const shouldUseVirtualScroll = computed<boolean>(() => props.tasks.length > VIRTUAL_SCROLL_THRESHOLD)
const virtualScrollerRef = ref<VirtualScrollerInstanceLike | null>(null)

const {
  editingTaskId,
  dragTaskId,
  dragOverTaskId,
  subtaskDrafts,
  subtaskPlanDrafts,
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
} = useTaskListModel(props as TaskListProps, emit)

function ensureTaskVisible(index: number): void {
  virtualScrollerRef.value?.scrollToItem?.(index)
}

function completedSubtaskCount(task: Task): number {
  return task.subtasks.filter((subtask) => subtask.completed).length
}

watchEffect(() => {
  registerTaskVisibilityHandler(shouldUseVirtualScroll.value ? ensureTaskVisible : null)
})
</script>

<template>
  <div class="task-list-wrap">
    <div class="list-head">
      <h2>任务列表</h2>
      <a-typography-text type="secondary">支持拖拽排序 / Space 切换完成状态</a-typography-text>
    </div>

    <a-empty v-if="props.tasks.length === 0" description="当前没有匹配的任务" />

    <DynamicScroller
      v-else
      ref="virtualScrollerRef"
      class="task-list"
      :class="{ 'task-list-virtual-enabled': shouldUseVirtualScroll }"
      :items="props.tasks"
      key-field="id"
      :min-item-size="220"
      :prerender="shouldUseVirtualScroll ? 6 : props.tasks.length"
      :buffer="shouldUseVirtualScroll ? 300 : 0"
    >
      <template #default="{ item: task, index, active }">
        <DynamicScrollerItem
          :item="task"
          :active="active"
          :size-dependencies="[task.updatedAt, task.subtasks.length, editingTaskId === task.id, editingSubtaskTextKey, editingSubtaskPlanKey]"
          class="task-scroller-item"
        >
          <article
        :id="`task-item-${task.id}`"
        :data-task-index="index"
        :data-task-id="task.id"
        class="task-item"
        :class="{
          dragging: dragTaskId === task.id,
          over: dragOverTaskId === task.id,
          done: task.completed,
        }"
        tabindex="0"
        :ref="(el) => setTaskItemRef(index, el)"
        @keydown.space.prevent="handleTaskSpaceToggle(task, $event)"
        @keydown.up="handleTaskArrowNavigation(index, -1, $event)"
        @keydown.down="handleTaskArrowNavigation(index, 1, $event)"
        @keydown.tab="handleTaskTabNavigation(index, $event)"
          >
        <a-card :bordered="false" class="task-card">
          <div
            class="task-drag-zone"
            draggable="true"
            @dragstart="handleDragStart(task.id, $event)"
            @dragend="resetDragState"
            @dragover.prevent="dragOverTaskId = task.id"
            @dragleave="dragOverTaskId = null"
            @drop.prevent="handleDrop(task.id)"
          >
            <div class="task-top">
              <div class="task-core">
                <div class="control-group">
                  <a-checkbox
                    :checked="props.selectedTaskIds.includes(task.id)"
                    @mousedown.stop
                    @click.stop
                    @change="handleTaskSelectedChange(task.id)"
                  />
                  <span class="control-label">选择</span>
                </div>
                <div class="control-group">
                  <a-checkbox
                    :checked="task.completed"
                    @mousedown.stop
                    @click.stop
                    @change="handleTaskCompletedChange(task)"
                  />
                  <span class="control-label action-label" @click.stop="confirmToggleTaskCompleted(task)">
                    完成
                  </span>
                </div>
                <h3>{{ task.title }}</h3>
              </div>

              <a-space>
                <a-button size="small" type="primary" class="edit-action-btn" @click="beginEdit(task)">编辑</a-button>
                <a-button
                  size="small"
                  type="primary"
                  danger
                  class="delete-action-btn"
                  @click="emit('deleteTask', task.id)"
                >
                  删除
                </a-button>
              </a-space>
            </div>

            <div class="meta-row">
              <TaskMetaTags
                :task="task"
                :project-name="props.projectNameById.get(task.projectId) || '未知清单'"
                :due-date-text="props.formatDueDate(task.dueDate)"
                :due-hint="props.dueHint(task)"
                :due-status="props.dueStatus(task)"
              />
            </div>

            <p v-if="task.description" class="desc">{{ task.description }}</p>

            <div v-if="editingTaskId === task.id" class="edit-grid">
              <a-input v-model:value="editForm.title" />
              <a-textarea v-model:value="editForm.description" :rows="2" />
              <a-input v-model:value="editForm.dueDate" type="datetime-local" />
              <a-select v-model:value="editForm.priority" :options="priorityOptions" />
              <a-select v-model:value="editForm.projectId" :options="projectOptions" />
              <a-space>
                <a-button type="primary" @click="saveEdit(task.id)">保存</a-button>
                <a-button @click="cancelEdit">取消</a-button>
              </a-space>
            </div>

            <a-divider />
          </div>

          <div class="subtasks-wrap">
            <h4>子任务（{{ completedSubtaskCount(task) }}/{{ task.subtasks.length }}）</h4>

            <div v-if="task.subtasks.length > 0" class="subtask-list">
              <div
                v-for="subtask in task.subtasks"
                :key="subtask.id"
                :id="`subtask-item-${task.id}-${subtask.id}`"
                :data-task-id="task.id"
                :data-subtask-id="subtask.id"
                class="subtask-item"
              >
                <div class="subtask-main">
                  <div class="subtask-title-row">
                    <template v-if="editingSubtaskTextKey === subtaskPlanKey(task.id, subtask.id)">
                      <a-checkbox
                        :checked="subtask.completed"
                        @change="emit('toggleSubtaskCompleted', { taskId: task.id, subtaskId: subtask.id })"
                      />
                      <a-input
                        :value="getSubtaskTextDraft(task.id, subtask.id, subtask.text)"
                        size="small"
                        class="subtask-text-editor"
                        placeholder="子任务名称"
                        @update:value="handleSubtaskTextDraftChange(task.id, subtask.id, $event)"
                        @press-enter="handleUpdateSubtaskText(task.id, subtask.id)"
                        @keydown.esc.prevent="cancelEditSubtaskText"
                      />
                      <a-button size="small" type="link" @click="handleUpdateSubtaskText(task.id, subtask.id)">
                        保存
                      </a-button>
                      <a-button size="small" type="link" @click="cancelEditSubtaskText">取消</a-button>
                    </template>
                    <template v-else>
                      <a-checkbox
                        :checked="subtask.completed"
                        @change="emit('toggleSubtaskCompleted', { taskId: task.id, subtaskId: subtask.id })"
                      />
                      <span class="subtask-text-with-copy">
                        <span :class="{ checked: subtask.completed }">
                          {{ subtask.text }}
                        </span>
                        <a-button
                          size="small"
                          type="text"
                          class="copy-subtask-btn"
                          @click.stop="copySubtaskText(subtask.text)"
                        >
                          <CopyOutlined />
                        </a-button>
                      </span>
                    </template>
                  </div>
                  <div class="subtask-plan-row">
                    <small class="planned-time">预计：{{ formatPlannedDate(subtask.plannedAt) }}</small>

                    <div
                      v-if="editingSubtaskPlanKey === subtaskPlanKey(task.id, subtask.id)"
                      class="subtask-plan-editor"
                      :ref="(el) => setSubtaskPlanEditorRef(subtaskPlanKey(task.id, subtask.id), el)"
                    >
                      <a-input
                        :value="getSubtaskPlanDraft(task.id, subtask.id, subtask.plannedAt)"
                        type="datetime-local"
                        size="small"
                        placeholder="设置预计完成时间"
                        @update:value="handleSubtaskPlanDraftChange(task.id, subtask.id, $event)"
                        @press-enter="handleUpdateSubtaskPlannedAt(task.id, subtask.id)"
                      />
                      <a-button size="small" type="primary" @click="handleUpdateSubtaskPlannedAt(task.id, subtask.id)">
                        保存
                      </a-button>
                    </div>
                    <a-button
                      v-else
                      size="small"
                      type="link"
                      @click="beginEditSubtaskPlannedAt(task.id, subtask.id, subtask.plannedAt)"
                    >
                      修改时间
                    </a-button>
                  </div>
                </div>
                <div class="subtask-actions">
                  <a-button
                    size="small"
                    type="text"
                    class="subtask-action-btn"
                    @click="beginEditSubtaskText(task.id, subtask.id, subtask.text)"
                  >
                    <FormOutlined />
                  </a-button>
                  <a-button
                    size="small"
                    type="text"
                    danger
                    class="subtask-action-btn"
                    @click="emit('deleteSubtask', { taskId: task.id, subtaskId: subtask.id })"
                  >
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>

            <div class="subtask-create">
              <a-input
                v-model:value="subtaskDrafts[task.id]"
                placeholder="新增子任务并回车"
                @press-enter="handleAddSubtask(task.id)"
              />
              <a-input
                v-model:value="subtaskPlanDrafts[task.id]"
                type="datetime-local"
                placeholder="预计完成时间（可选）"
              />
              <a-button @click="handleAddSubtask(task.id)">添加</a-button>
            </div>
          </div>
        </a-card>
      </article>
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
  </div>
</template>

<style scoped>
.task-list-wrap {
  display: grid;
  gap: 10px;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

h2 {
  margin: 0;
}

.task-list {
  display: block;
}

.task-list.task-list-virtual-enabled {
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 4px;
}

.task-scroller-item {
  padding-bottom: 10px;
}

.task-scroller-item:last-child {
  padding-bottom: 0;
}

.task-item {
  outline: none;
}

.task-item.dragging {
  opacity: 0.6;
}

.task-item.over .task-card {
  box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.24);
}

.task-item.done h3 {
  text-decoration: line-through;
  color: #8d7a99;
}

.task-card {
  border-radius: 16px;
}

.task-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.task-core {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.control-label {
  color: #6b5a78;
  font-size: 12px;
  line-height: 1;
}

.action-label {
  cursor: pointer;
  user-select: none;
}

.task-core h3 {
  margin: 0;
  font-size: 16px;
}

.edit-action-btn {
  background: #a29bfe;
  border-color: #a29bfe;
}

.edit-action-btn:hover,
.edit-action-btn:focus {
  background: #b2acff;
  border-color: #b2acff;
}

.delete-action-btn {
  background: rgba(196, 69, 100, 0.9);
  border-color: rgba(196, 69, 100, 0.9);
}

.delete-action-btn:hover,
.delete-action-btn:focus {
  background: rgba(208, 91, 119, 0.9);
  border-color: rgba(208, 91, 119, 0.9);
}

.meta-row {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.desc {
  margin: 8px 0 0;
  color: #5e4f69;
}

.edit-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1.3fr 1.5fr 1fr 0.8fr 0.9fr auto;
  gap: 8px;
}

.subtasks-wrap h4 {
  margin: 0 0 8px;
}

.subtask-list {
  display: grid;
  gap: 4px;
  margin-bottom: 8px;
}

.subtask-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.subtask-item label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtask-main {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.subtask-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.subtask-text-with-copy {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  word-break: break-word;
}

.copy-subtask-btn {
  display: inline-flex;
  vertical-align: baseline;
  margin-left: 4px;
  padding-inline: 4px;
}

.copy-subtask-btn :deep(svg) {
  transform: rotate(180deg);
}

.subtask-text-editor {
  width: min(100%, 640px);
  min-width: 280px;
  max-width: 640px;
  flex: 1 1 420px;
}

.subtask-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.subtask-action-btn {
  padding-inline: 4px;
}

.subtask-plan-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.checked {
  text-decoration: line-through;
  color: #9985a8;
}

.planned-time {
  color: #7a6c86;
}

.subtask-plan-editor {
  display: inline-grid;
  grid-template-columns: minmax(210px, 240px) auto;
  gap: 8px;
  align-items: center;
}

.subtask-create {
  display: grid;
  grid-template-columns: 1fr 220px auto;
  gap: 8px;
}

@media (max-width: 1080px) {
  .edit-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .list-head,
  .task-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .edit-grid,
  .subtask-create {
    grid-template-columns: 1fr;
  }

  .subtask-plan-editor {
    grid-template-columns: 1fr;
  }
}
</style>
