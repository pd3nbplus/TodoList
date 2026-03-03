<script setup lang="ts">
const props = withDefaults(defineProps<{
  stats: {
    total: number
    active: number
    completed: number
    overdue: number
    totalSubtasks: number
    activeSubtasks: number
    completedSubtasks: number
    subtaskCompletionRate: number
  }
}>(), {
  stats: () => ({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0,
    totalSubtasks: 0,
    activeSubtasks: 0,
    completedSubtasks: 0,
    subtaskCompletionRate: 0,
  }),
})
</script>

<template>
  <a-card class="todo-header" :bordered="false">
    <div class="title-row">
      <div>
        <p class="eyebrow">TodoList · Ant Design Vue</p>
        <h1>任务画布</h1>
        <p class="desc">支持项目分类、搜索筛选、子任务、拖拽排序、撤销与本地持久化。</p>
      </div>
    </div>

    <a-row :gutter="[12, 12]" class="stats-row">
      <a-col :xs="12" :sm="6">
        <a-statistic title="总任务" :value="props.stats.total" />
        <p class="stat-note">子任务 {{ props.stats.totalSubtasks }}</p>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-statistic title="未完成" :value="props.stats.active" />
        <p class="stat-note">子任务 {{ props.stats.activeSubtasks }}</p>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-statistic title="已完成" :value="props.stats.completed" />
        <p class="stat-note">
          子项进度 {{ props.stats.subtaskCompletionRate }}%（{{ props.stats.completedSubtasks }}/{{ props.stats.totalSubtasks }}）
        </p>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-statistic title="逾期" :value="props.stats.overdue" :value-style="{ color: '#e67e22' }" />
      </a-col>
    </a-row>
  </a-card>
</template>

<style scoped>
.todo-header {
  margin-top: 80px;
  border-radius: 18px;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(155, 89, 182, 0.12) 0px,
      rgba(155, 89, 182, 0.12) 10px,
      rgba(255, 255, 255, 0.05) 10px,
      rgba(255, 255, 255, 0.05) 22px
    ),
    linear-gradient(135deg, rgba(155, 89, 182, 0.2), rgba(255, 255, 255, 0.95));
  border: 1px solid rgba(155, 89, 182, 0.18);
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7f6694;
}

h1 {
  margin: 8px 0;
  font-size: clamp(1.6rem, 2.6vw, 2.1rem);
}

.desc {
  margin: 0;
  color: #6d5c79;
}

.stats-row {
  margin-top: 14px;
}

.stat-note {
  margin: 4px 0 0;
  font-size: 12px;
  color: #7a6c86;
}
</style>
