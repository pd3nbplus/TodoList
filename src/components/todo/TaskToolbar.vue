<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { FilterState } from '../../types/todo'

const props = withDefaults(defineProps<{
  filters?: FilterState
}>(), {
  filters: () => ({
    search: '',
    status: 'all',
    priority: 'all',
    projectId: 'all',
    due: 'all',
    sortBy: 'created_desc',
  }),
})

const emit = defineEmits<{
  updateFilters: [patch: Partial<FilterState>]
}>()

const STATUS_VALUES: FilterState['status'][] = ['all', 'active', 'completed']
const PRIORITY_VALUES: FilterState['priority'][] = ['all', 'high', 'medium', 'low']
const DUE_VALUES: FilterState['due'][] = ['all', 'today', 'tomorrow', 'week', 'overdue']
const SORT_VALUES: FilterState['sortBy'][] = ['created_desc', 'due_asc', 'priority_desc', 'manual']

function setFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
  emit('updateFilters', { [key]: value } as Partial<FilterState>)
}

function updateSearch(value: string): void {
  setFilter('search', value)
}

function updateStatus(value: SelectValue): void {
  if (typeof value !== 'string' || !STATUS_VALUES.includes(value as FilterState['status'])) {
    return
  }
  setFilter('status', value as FilterState['status'])
}

function updatePriority(value: SelectValue): void {
  if (typeof value !== 'string' || !PRIORITY_VALUES.includes(value as FilterState['priority'])) {
    return
  }
  setFilter('priority', value as FilterState['priority'])
}

function updateDue(value: SelectValue): void {
  if (typeof value !== 'string' || !DUE_VALUES.includes(value as FilterState['due'])) {
    return
  }
  setFilter('due', value as FilterState['due'])
}

function updateSortBy(value: SelectValue): void {
  if (typeof value !== 'string' || !SORT_VALUES.includes(value as FilterState['sortBy'])) {
    return
  }
  setFilter('sortBy', value as FilterState['sortBy'])
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
