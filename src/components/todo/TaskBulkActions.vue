<script setup lang="ts">
const props = defineProps<{
  selectedCount: number
}>()

const emit = defineEmits<{
  deleteSelected: []
  clearSelected: []
  selectAllVisible: []
}>()
</script>

<template>
  <a-card v-if="props.selectedCount > 0" :bordered="false" class="bulk-card">
    <a-space wrap>
      <a-tag color="purple">已选择 {{ props.selectedCount }} 个任务</a-tag>
      <a-button type="primary" danger @click="emit('deleteSelected')">批量删除</a-button>
      <a-button @click="emit('clearSelected')">取消选择</a-button>
      <a-button type="dashed" @click="emit('selectAllVisible')">全选当前列表</a-button>
    </a-space>
  </a-card>
</template>

<style scoped>
.bulk-card {
  border-radius: 16px;
}
</style>
