<script setup lang="ts">
import type { FilterState } from '../../types/todo'

const props = defineProps<{
  filters: FilterState
}>()

const emit = defineEmits<{
  updateFilters: [patch: Partial<FilterState>]
}>()

function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
  emit('updateFilters', { [key]: value } as Partial<FilterState>)
}

function updateSearch(value: string) {
  setFilter('search', value)
}

function updateStatus(value: FilterState['status']) {
  setFilter('status', value)
}

function updatePriority(value: FilterState['priority']) {
  setFilter('priority', value)
}

function updateDue(value: FilterState['due']) {
  setFilter('due', value)
}

function updateSortBy(value: FilterState['sortBy']) {
  setFilter('sortBy', value)
}
</script>

<template>
  <a-card :bordered="false" class="toolbar-card">
    <div class="toolbar-grid">
      <a-input-search
        :value="props.filters.search"
        allow-clear
        placeholder="搜索标题、描述、子任务"
        @update:value="updateSearch"
      />

      <a-select
        :value="props.filters.status"
        :options="[
          { value: 'all', label: '全部状态' },
          { value: 'active', label: '未完成' },
          { value: 'completed', label: '已完成' },
        ]"
        @update:value="updateStatus"
      />

      <a-select
        :value="props.filters.priority"
        :options="[
          { value: 'all', label: '全部优先级' },
          { value: 'high', label: '高优先级' },
          { value: 'medium', label: '中优先级' },
          { value: 'low', label: '低优先级' },
        ]"
        @update:value="updatePriority"
      />

      <a-select
        :value="props.filters.due"
        :options="[
          { value: 'all', label: '全部日期' },
          { value: 'today', label: '今天截止' },
          { value: 'tomorrow', label: '明天截止' },
          { value: 'week', label: '7天内截止' },
          { value: 'overdue', label: '已逾期' },
        ]"
        @update:value="updateDue"
      />

      <a-select
        :value="props.filters.sortBy"
        :options="[
          { value: 'created_desc', label: '按创建时间' },
          { value: 'due_asc', label: '按截止时间' },
          { value: 'priority_desc', label: '按优先级' },
          { value: 'manual', label: '手动排序' },
        ]"
        @update:value="updateSortBy"
      />
    </div>
  </a-card>
</template>

<style scoped>
.toolbar-card {
  border-radius: 16px;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: 2fr repeat(4, 1fr);
  gap: 8px;
}

@media (max-width: 1120px) {
  .toolbar-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .toolbar-grid {
    grid-template-columns: 1fr;
  }
}
</style>
