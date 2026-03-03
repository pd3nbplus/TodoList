<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons-vue'
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
const expanded = ref(false)
const titleInputRef = ref()

function toggleComposer() {
  expanded.value = !expanded.value
  if (expanded.value) {
    void nextTick(() => {
      titleInputRef.value?.focus?.()
    })
  }
}

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
  expanded.value = false
}
</script>

<template>
  <a-card :bordered="false" class="composer-card">
    <template #title>添加任务</template>
    <template #extra>
      <div class="composer-extra">
        <span v-if="!expanded" class="composer-inline-hint">点击右侧 + 展开添加任务</span>
        <a-button type="text" class="composer-toggle-btn" @click="toggleComposer">
          <PlusCircleOutlined v-if="!expanded" />
          <MinusCircleOutlined v-else />
        </a-button>
      </div>
    </template>

    <div v-if="expanded" class="composer-grid">
      <a-input
        ref="titleInputRef"
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

.composer-extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.composer-inline-hint {
  color: #7a6c86;
  font-size: 13px;
}

.composer-toggle-btn {
  color: #9b59b6;
  font-size: 22px;
  line-height: 1;
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
