<script setup lang="ts">
import { reactive } from 'vue'
import type { Project, TaskFormInput, TaskPriority } from '../../types/todo'

const props = defineProps<{
  projects: Project[]
  defaultProjectId: string
}>()

const emit = defineEmits<{
  createTask: [payload: TaskFormInput]
}>()

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

const form = reactive<TaskFormInput>({
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  projectId: props.defaultProjectId,
})

function submitTask() {
  if (!form.title.trim()) {
    return
  }

  emit('createTask', {
    title: form.title,
    description: form.description,
    dueDate: form.dueDate,
    priority: form.priority,
    projectId: form.projectId,
  })

  form.title = ''
  form.description = ''
  form.dueDate = ''
  form.priority = 'medium'
  form.projectId = props.defaultProjectId
}
</script>

<template>
  <a-card title="添加任务" :bordered="false" class="composer-card">
    <div class="composer-grid">
      <a-input
        v-model:value="form.title"
        placeholder="输入任务标题并回车"
        @press-enter="submitTask"
      />
      <a-textarea v-model:value="form.description" :rows="2" placeholder="描述（可选）" />
      <a-input v-model:value="form.dueDate" type="datetime-local" />
      <a-select v-model:value="form.priority" :options="priorityOptions" />
      <a-select
        v-model:value="form.projectId"
        :options="props.projects.map((project) => ({ value: project.id, label: project.name }))"
      />
      <a-button type="primary" @click="submitTask">添加任务</a-button>
    </div>
  </a-card>
</template>

<style scoped>
.composer-card {
  border-radius: 16px;
}

.composer-grid {
  display: grid;
  grid-template-columns: 2fr 2fr 1.4fr 1fr 1fr auto;
  gap: 8px;
}

@media (max-width: 1120px) {
  .composer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .composer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
