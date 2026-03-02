<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { CopyOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons-vue'
import type { Project, Task, TaskFormInput, TaskPriority } from '../../types/todo'

const props = defineProps<{
  tasks: Task[]
  projects: Project[]
  selectedTaskIds: string[]
  projectNameById: Map<string, string>
  formatDueDate: (value: string | null) => string
  dueStatus: (task: Task) => 'none' | 'overdue' | 'today' | 'tomorrow' | 'week'
  dueHint: (task: Task) => string | null
  toLocalDateTimeInputValue: (value: string | null) => string
}>()

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

function priorityLabel(priority: TaskPriority): string {
  return priorityOptions.find((item) => item.value === priority)?.label ?? priority
}

function beginEdit(task: Task) {
  editingTaskId.value = task.id
  editForm.title = task.title
  editForm.description = task.description
  editForm.dueDate = props.toLocalDateTimeInputValue(task.dueDate)
  editForm.priority = task.priority
  editForm.projectId = task.projectId
}

function saveEdit(taskId: string) {
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

function cancelEdit() {
  editingTaskId.value = null
}

function handleTaskSpaceToggle(task: Task, event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (!target) {
    return
  }

  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) {
    return
  }

  confirmToggleTaskCompleted(task)
}

function handleTaskSelectedChange(taskId: string) {
  emit('toggleTaskSelected', taskId)
}

function handleTaskCompletedChange(task: Task) {
  confirmToggleTaskCompleted(task)
}

function confirmToggleTaskCompleted(task: Task) {
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

function handleAddSubtask(taskId: string) {
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

function setSubtaskPlanDraft(taskId: string, subtaskId: string, value: string) {
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

function handleSubtaskTextDraftChange(taskId: string, subtaskId: string, value: string) {
  const key = subtaskPlanKey(taskId, subtaskId)
  subtaskTextDrafts[key] = value
}

function beginEditSubtaskText(taskId: string, subtaskId: string, text: string) {
  const key = subtaskPlanKey(taskId, subtaskId)
  subtaskTextDrafts[key] = text
  editingSubtaskTextKey.value = key
}

function cancelEditSubtaskText() {
  const key = editingSubtaskTextKey.value
  if (!key) {
    return
  }

  delete subtaskTextDrafts[key]
  editingSubtaskTextKey.value = null
}

function handleUpdateSubtaskText(taskId: string, subtaskId: string) {
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

function handleSubtaskPlanDraftChange(taskId: string, subtaskId: string, value: string) {
  setSubtaskPlanDraft(taskId, subtaskId, value)
}

function handleUpdateSubtaskPlannedAt(taskId: string, subtaskId: string) {
  const key = subtaskPlanKey(taskId, subtaskId)
  emit('updateSubtaskPlannedAt', {
    taskId,
    subtaskId,
    plannedAt: subtaskPlanDrafts[key] || '',
  })
  editingSubtaskPlanKey.value = null
  delete subtaskPlanDrafts[key]
}

function beginEditSubtaskPlannedAt(taskId: string, subtaskId: string, plannedAt: string | null) {
  const key = subtaskPlanKey(taskId, subtaskId)
  subtaskPlanDrafts[key] = props.toLocalDateTimeInputValue(plannedAt)
  editingSubtaskPlanKey.value = key
}

function cancelEditSubtaskPlannedAt() {
  const key = editingSubtaskPlanKey.value
  if (!key) {
    return
  }

  delete subtaskPlanDrafts[key]
  editingSubtaskPlanKey.value = null
}

function setSubtaskPlanEditorRef(key: string, el: Element | ComponentPublicInstance | null) {
  if (el && '$el' in el) {
    subtaskPlanEditorRefs[key] = (el.$el as HTMLElement | null) ?? null
    return
  }

  subtaskPlanEditorRefs[key] = (el as HTMLElement | null) ?? null
}

function handlePagePointerDown(event: MouseEvent) {
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

function resetDragState() {
  dragTaskId.value = null
  dragOverTaskId.value = null
}

function handleDragStart(taskId: string, event: DragEvent) {
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

function handleDrop(targetTaskId: string) {
  if (!dragTaskId.value || dragTaskId.value === targetTaskId) {
    resetDragState()
    return
  }

  emit('reorderTasks', { draggedTaskId: dragTaskId.value, targetTaskId })
  resetDragState()
}

function setTaskItemRef(index: number, el: Element | ComponentPublicInstance | null) {
  if (el && '$el' in el) {
    taskItemRefs.value[index] = (el.$el as HTMLElement | null) ?? null
    return
  }

  taskItemRefs.value[index] = (el as HTMLElement | null) ?? null
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest('input,textarea,select,button,a,label,.ant-checkbox-wrapper,.ant-input,.ant-select'),
  )
}

function focusTaskByIndex(index: number) {
  const el = taskItemRefs.value[index]
  el?.focus()
}

function handleTaskArrowNavigation(index: number, step: number, event: KeyboardEvent) {
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

function handleTaskTabNavigation(index: number, event: KeyboardEvent) {
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

function dueTagColor(task: Task): string {
  const status = props.dueStatus(task)
  if (status === 'overdue') return 'red'
  if (status === 'today') return 'orange'
  if (status === 'tomorrow') return 'blue'
  if (status === 'week') return 'cyan'
  return 'default'
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

async function copySubtaskText(text: string) {
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
</script>

<template>
  <div class="task-list-wrap">
    <div class="list-head">
      <h2>任务列表</h2>
      <a-typography-text type="secondary">支持拖拽排序 / Space 切换完成状态</a-typography-text>
    </div>

    <a-empty v-if="props.tasks.length === 0" description="当前没有匹配的任务" />

    <div v-else class="task-list">
      <article
        v-for="(task, index) in props.tasks"
        :key="task.id"
        :id="`task-item-${task.id}`"
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
              <a-tag :color="task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'gold' : 'green'">
                优先级：{{ priorityLabel(task.priority) }}
              </a-tag>
              <a-tag color="purple">{{ props.projectNameById.get(task.projectId) || '未知清单' }}</a-tag>
              <a-tag :color="dueTagColor(task)">
                截止：{{ props.formatDueDate(task.dueDate) }}
                <template v-if="props.dueHint(task)"> · {{ props.dueHint(task) }}</template>
              </a-tag>
              <a-tag :color="task.completed ? 'success' : 'processing'">
                {{ task.completed ? '已完成' : '未完成' }}
              </a-tag>
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
            <h4>子任务（{{ task.subtasks.filter((item) => item.completed).length }}/{{ task.subtasks.length }}）</h4>

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
    </div>
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
  display: grid;
  gap: 10px;
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
