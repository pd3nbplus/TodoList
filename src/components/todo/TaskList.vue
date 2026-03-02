<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
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
  toggleTaskCompleted: [taskId: string]
  deleteTask: [taskId: string]
  updateTask: [payload: { taskId: string; input: TaskFormInput }]
  addSubtask: [payload: { taskId: string; text: string }]
  toggleSubtaskCompleted: [payload: { taskId: string; subtaskId: string }]
  deleteSubtask: [payload: { taskId: string; subtaskId: string }]
  reorderTasks: [payload: { draggedTaskId: string; targetTaskId: string }]
}>()

const editingTaskId = ref<string | null>(null)
const dragTaskId = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)
const subtaskDrafts = reactive<Record<string, string>>({})

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

function handleTaskSpaceToggle(taskId: string, event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (!target) {
    return
  }

  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) {
    return
  }

  emit('toggleTaskCompleted', taskId)
}

function handleAddSubtask(taskId: string) {
  const text = (subtaskDrafts[taskId] ?? '').trim()
  if (!text) {
    return
  }

  emit('addSubtask', { taskId, text })
  subtaskDrafts[taskId] = ''
}

function handleDragStart(taskId: string) {
  dragTaskId.value = taskId
}

function handleDrop(targetTaskId: string) {
  if (!dragTaskId.value || dragTaskId.value === targetTaskId) {
    return
  }

  emit('reorderTasks', { draggedTaskId: dragTaskId.value, targetTaskId })
  dragTaskId.value = null
  dragOverTaskId.value = null
}

function dueTagColor(task: Task): string {
  const status = props.dueStatus(task)
  if (status === 'overdue') return 'red'
  if (status === 'today') return 'orange'
  if (status === 'tomorrow') return 'blue'
  if (status === 'week') return 'cyan'
  return 'default'
}
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
        v-for="task in props.tasks"
        :key="task.id"
        class="task-item"
        :class="{
          dragging: dragTaskId === task.id,
          over: dragOverTaskId === task.id,
          done: task.completed,
        }"
        tabindex="0"
        draggable="true"
        @dragstart="handleDragStart(task.id)"
        @dragover.prevent="dragOverTaskId = task.id"
        @dragleave="dragOverTaskId = null"
        @drop.prevent="handleDrop(task.id)"
        @keydown.space.prevent="handleTaskSpaceToggle(task.id, $event)"
      >
        <a-card :bordered="false" class="task-card">
          <div class="task-top">
            <div class="task-core">
              <a-checkbox
                :checked="props.selectedTaskIds.includes(task.id)"
                @change="emit('toggleTaskSelected', task.id)"
              />
              <a-checkbox :checked="task.completed" @change="emit('toggleTaskCompleted', task.id)" />
              <h3>{{ task.title }}</h3>
            </div>

            <a-space>
              <a-button size="small" @click="beginEdit(task)">编辑</a-button>
              <a-button size="small" danger @click="emit('deleteTask', task.id)">删除</a-button>
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

          <div class="subtasks-wrap">
            <h4>子任务（{{ task.subtasks.filter((item) => item.completed).length }}/{{ task.subtasks.length }}）</h4>

            <div v-if="task.subtasks.length > 0" class="subtask-list">
              <div v-for="subtask in task.subtasks" :key="subtask.id" class="subtask-item">
                <label>
                  <a-checkbox
                    :checked="subtask.completed"
                    @change="emit('toggleSubtaskCompleted', { taskId: task.id, subtaskId: subtask.id })"
                  />
                  <span :class="{ checked: subtask.completed }">{{ subtask.text }}</span>
                </label>
                <a-button
                  type="link"
                  danger
                  @click="emit('deleteSubtask', { taskId: task.id, subtaskId: subtask.id })"
                >
                  删除
                </a-button>
              </div>
            </div>

            <div class="subtask-create">
              <a-input
                v-model:value="subtaskDrafts[task.id]"
                placeholder="新增子任务并回车"
                @press-enter="handleAddSubtask(task.id)"
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

.task-core h3 {
  margin: 0;
  font-size: 16px;
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
  align-items: center;
  gap: 8px;
}

.subtask-item label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checked {
  text-decoration: line-through;
  color: #9985a8;
}

.subtask-create {
  display: grid;
  grid-template-columns: 1fr auto;
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
}
</style>
