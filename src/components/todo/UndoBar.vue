<script setup lang="ts">
const props = withDefaults(defineProps<{
  message?: string | null
}>(), {
  message: null,
})

const emit = defineEmits<{
  undo: []
}>()
</script>

<template>
  <div v-if="props.message" class="undo-bar">
    <a-alert type="info" show-icon>
      <template #message>{{ props.message }}</template>
      <template #action>
        <a-button type="link" @click="emit('undo')">撤销</a-button>
      </template>
    </a-alert>
  </div>
</template>

<style scoped>
.undo-bar {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  z-index: 100;
  width: min(640px, calc(100vw - 24px));
}
</style>
