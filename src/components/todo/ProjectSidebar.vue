<script setup lang="ts">
import { ref } from 'vue'
import type { Project } from '../../types/todo'

const props = defineProps<{
  projects: Project[]
  selectedProjectId: string | 'all'
  defaultProjectId: string
  notificationPermission: NotificationPermission | 'unsupported'
}>()

const emit = defineEmits<{
  addProject: [name: string]
  selectProject: [projectId: string | 'all']
  removeProject: [projectId: string]
  requestNotification: []
}>()

const newProjectName = ref('')

function submitProject() {
  const name = newProjectName.value.trim()
  if (!name) {
    return
  }

  emit('addProject', name)
  newProjectName.value = ''
}
</script>

<template>
  <a-card title="清单" class="sidebar-card" :bordered="false">
    <div class="project-create">
      <a-input
        v-model:value="newProjectName"
        placeholder="新增清单（如 工作）"
        @press-enter="submitProject"
      />
      <a-button type="primary" @click="submitProject">添加</a-button>
    </div>

    <div class="project-list">
      <a-button
        block
        :type="selectedProjectId === 'all' ? 'primary' : 'default'"
        @click="emit('selectProject', 'all')"
      >
        全部清单
      </a-button>

      <div v-for="project in props.projects" :key="project.id" class="project-item">
        <a-button
          block
          class="project-select"
          :type="selectedProjectId === project.id ? 'primary' : 'default'"
          @click="emit('selectProject', project.id)"
        >
          {{ project.name }}
        </a-button>
        <a-button
          v-if="project.id !== props.defaultProjectId"
          danger
          @click="emit('removeProject', project.id)"
        >
          删除
        </a-button>
      </div>
    </div>

    <a-divider />

    <div class="notify">
      <a-button
        v-if="props.notificationPermission !== 'granted'"
        type="dashed"
        block
        @click="emit('requestNotification')"
      >
        开启浏览器提醒
      </a-button>
      <a-alert v-else type="success" show-icon message="浏览器提醒已开启" />
    </div>
  </a-card>
</template>

<style scoped>
.sidebar-card {
  border-radius: 16px;
  height: 100%;
}

.project-create {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.project-list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.project-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.project-select {
  text-align: left;
}
</style>
