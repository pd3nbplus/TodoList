<script setup lang="ts">
const props = defineProps<{
  stats: {
    total: number
    active: number
    completed: number
    overdue: number
  }
}>()
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
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-statistic title="未完成" :value="props.stats.active" />
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-statistic title="已完成" :value="props.stats.completed" />
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-statistic title="逾期" :value="props.stats.overdue" :value-style="{ color: '#e67e22' }" />
      </a-col>
    </a-row>
  </a-card>
</template>

<style scoped>
.todo-header {
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.12), rgba(255, 255, 255, 0.95));
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
</style>
