<script setup lang="ts">
import { useTodoTimeline } from '../composables/useTodoTimeline'

const {
  sortedTasks,
  timelineScrollRef,
  timelineCanvasRef,
  timelineInfo,
  timelineCanvasHeight,
  timelineBodyHeight,
  dueAxes,
  groups,
  nowX,
  dragState,
  PARENT_Y,
  PX_PER_DAY,
  xFromIso,
  getSubtaskTimelineX,
  dueX,
  markerId,
  markerUrl,
  subtaskTop,
  formatShortDate,
  getSubtaskTimelineIso,
  formatSubtaskNodeText,
  handleSortByDueDate,
  jumpToHomeByTask,
  beginSubtaskDrag,
} = useTodoTimeline()
</script>

<template>
  <div class="roadmap-page">
    <a-card :bordered="false" class="summary-card">
      <div class="summary-head">
        <div>
          <h1>任务路线图</h1>
          <p>横轴为时间顺序，父任务以创建时间定位，子任务以完成/预计完成时间定位。</p>
        </div>
        <a-space wrap>
          <a-tag color="purple">父任务按优先级 + 截止日期排序展示</a-tag>
          <a-tag color="default">灰色：未完成子任务</a-tag>
          <a-tag color="success">绿色：已完成任务/子任务</a-tag>
          <a-button type="primary" @click="handleSortByDueDate">一键按优先级+截止日期排序</a-button>
        </a-space>
      </div>
      <a-alert type="info" show-icon message="本页仅用于查看与规划（支持未完成子任务横向拖拽设置预计完成时间）。" />
    </a-card>

    <a-empty v-if="sortedTasks.length === 0" description="暂无任务可展示" />

    <div v-else ref="timelineScrollRef" class="timeline-scroll">
      <div
        ref="timelineCanvasRef"
        class="timeline-canvas"
        :style="{ width: `${timelineInfo.width}px`, height: `${timelineCanvasHeight}px` }"
      >
        <div class="timeline-body" :style="{ height: `${timelineBodyHeight}px` }">
          <div class="now-line" :style="{ left: `${nowX}px` }">
            <span>当前时间</span>
          </div>

          <div v-for="axis in dueAxes" :key="axis.ms" class="due-axis" :style="{ left: `${axis.x}px` }">
            <span>截止 {{ axis.label }}</span>
          </div>

          <section
            v-for="group in groups"
            :key="group.task.id"
            class="task-group"
            :style="{ top: `${group.top}px`, height: `${group.height}px` }"
          >
            <svg class="links-layer" :width="timelineInfo.width" :height="group.height">
              <defs>
                <marker :id="markerId(group.task.id)" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" :fill="group.task.completed ? '#52c41a' : '#9b59b6'" />
                </marker>
              </defs>

              <line
                v-for="(subtask, idx) in group.task.subtasks"
                :key="subtask.id"
                :x1="xFromIso(group.task.createdAt)"
                :y1="PARENT_Y + 16"
                :x2="getSubtaskTimelineX(group.task, subtask)"
                :y2="subtaskTop(idx) + 14"
                :stroke="group.task.completed ? '#52c41a' : '#9b59b6'"
                stroke-width="2"
                :marker-end="markerUrl(group.task.id)"
              />

              <line
                v-if="dueX(group.task) !== null"
                :x1="xFromIso(group.task.createdAt)"
                :y1="PARENT_Y + 16"
                :x2="dueX(group.task) || 0"
                :y2="PARENT_Y + 16"
                stroke="#ffb3b5"
                stroke-width="1.5"
                stroke-dasharray="4 6"
              />
            </svg>

            <div
              class="parent-node"
              :class="{ done: group.task.completed }"
              :style="{ left: `${xFromIso(group.task.createdAt)}px` }"
              @contextmenu.prevent="jumpToHomeByTask(group.task.id)"
            >
              <strong>{{ group.task.title }}</strong>
              <small>
                创建 {{ formatShortDate(group.task.createdAt) }} ·
                截止 {{ formatShortDate(group.task.dueDate) }}
              </small>
            </div>

            <div
              v-for="(subtask, idx) in group.task.subtasks"
              :key="subtask.id"
              class="subtask-node"
              :class="{
                done: subtask.completed,
                pending: !subtask.completed,
                dragging:
                  dragState.taskId === group.task.id && dragState.subtaskId === subtask.id,
              }"
              :style="{
                left: `${getSubtaskTimelineX(group.task, subtask)}px`,
                top: `${subtaskTop(idx)}px`,
              }"
              @contextmenu.prevent="jumpToHomeByTask(group.task.id, subtask.id)"
              @pointerdown="beginSubtaskDrag(group.task, subtask, $event)"
            >
              <span :title="subtask.text">{{ formatSubtaskNodeText(subtask.text) }}</span>
              <small>
                {{ subtask.completed ? '完成于' : '预计' }}
                {{ formatShortDate(getSubtaskTimelineIso(group.task, subtask)) }}
              </small>
            </div>
          </section>
        </div>

        <div class="timeline-footer">
          <div
            v-for="day in timelineInfo.days"
            :key="day.key"
            class="day-cell"
            :style="{ left: `${day.x}px`, width: `${PX_PER_DAY}px` }"
          >
            <span>{{ day.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roadmap-page {
  height: calc(100vh - 110px);
  min-height: 620px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 12px;
}

.summary-card {
  border-radius: 16px;
}

.summary-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.summary-head h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.summary-head p {
  margin: 0;
  color: #6b5a78;
}

.timeline-scroll {
  border: 1px solid #e6d6f0;
  border-radius: 14px;
  background: #fff;
  overflow: auto;
}

.timeline-canvas {
  position: relative;
}

.timeline-body {
  position: relative;
}

.timeline-footer {
  position: sticky;
  bottom: 0;
  height: 52px;
  background: linear-gradient(180deg, #fbf5ff, #f1e2fa);
  border-top: 1px solid #e7d7f2;
  z-index: 4;
}

.day-cell {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px dashed #f1e8f6;
  display: grid;
  place-items: center;
  color: #6d5a7d;
  font-size: 12px;
}

.now-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    rgba(114, 46, 209, 0.85) 0 14px,
    rgba(114, 46, 209, 0) 14px 20px
  );
  opacity: 0.85;
  z-index: 0;
  pointer-events: none;
}

.now-line span {
  position: absolute;
  left: 6px;
  bottom: 10px;
  white-space: nowrap;
  color: #722ed1;
  font-size: 12px;
  background: #f9f0ff;
  padding: 2px 6px;
  border-radius: 999px;
}

.due-axis {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    rgba(255, 77, 79, 0.72) 0 14px,
    rgba(255, 77, 79, 0) 14px 20px
  );
  z-index: 0;
  pointer-events: none;
}

.due-axis span {
  position: absolute;
  left: 6px;
  bottom: 10px;
  white-space: nowrap;
  color: #cf1322;
  font-size: 11px;
  background: #fff1f0;
  padding: 2px 6px;
  border-radius: 999px;
}

.task-group {
  position: absolute;
  left: 0;
  right: 0;
}

.links-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.parent-node,
.subtask-node {
  position: absolute;
  transform: translateX(-50%);
  min-width: 180px;
  max-width: 240px;
  border-radius: 12px;
  padding: 8px 10px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  z-index: 3;
}

.parent-node {
  top: 12px;
  background: #f9f0ff;
  border: 1px solid #d3adf7;
  color: #531dab;
}

.parent-node.done {
  background: #f6ffed;
  border-color: #95de64;
  color: #237804;
}

.subtask-node {
  cursor: ew-resize;
  transition: box-shadow 0.2s ease;
}

.subtask-node.pending {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  color: #434343;
}

.subtask-node.done {
  background: #f8fff2;
  border: 1px solid #b7eb8f;
  color: #389e0d;
  cursor: default;
}

.subtask-node.dragging {
  box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.22);
}

.parent-node strong,
.subtask-node span {
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
}

.parent-node small,
.subtask-node small {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.84;
}

@media (max-width: 960px) {
  .roadmap-page {
    height: auto;
    min-height: 560px;
  }

  .summary-head {
    flex-direction: column;
  }
}
</style>
