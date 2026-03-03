<script setup lang="ts">
import { computed } from 'vue'
import type { TodoInsights } from '../../types/todo'

const props = defineProps<{
  insights: TodoInsights
}>()

const averageCycleText = computed(() => {
  const days = props.insights.averageTaskCycleDays
  if (days === null) {
    return '--'
  }

  return days.toFixed(days >= 10 ? 1 : 2)
})

const averageDeviationText = computed(() => {
  const value = props.insights.delay.averageDeviationHours
  if (value === null) {
    return '--'
  }

  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}h`
})

function trendStatus(rate: number): 'success' | 'normal' | 'exception' {
  if (rate >= 75) {
    return 'success'
  }
  if (rate >= 45) {
    return 'normal'
  }
  return 'exception'
}

function delayStatus(index: number | null): 'success' | 'normal' | 'exception' {
  if (index === null) {
    return 'normal'
  }
  if (index <= 25) {
    return 'success'
  }
  if (index <= 50) {
    return 'normal'
  }
  return 'exception'
}
</script>

<template>
  <a-card class="insight-card" :bordered="false">
    <div class="head">
      <h2>数据看板</h2>
      <a-typography-text type="secondary">任务效率与分布概览</a-typography-text>
    </div>

    <a-row :gutter="[12, 12]" class="overview-row">
      <a-col :xs="24" :md="24" class="overview-col">
        <a-card size="small" class="inner-card" title="任务完成率趋势（日 / 周 / 月）">
          <div class="trend-list">
            <div v-for="item in props.insights.completionTrend" :key="item.label" class="trend-item">
              <div class="trend-top">
                <strong>{{ item.label }}</strong>
                <span>{{ item.completed }}/{{ item.totalCreated }}</span>
              </div>
              <a-progress
                :percent="Number(item.completionRate.toFixed(1))"
                :status="trendStatus(item.completionRate)"
                size="small"
              />
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="24" class="overview-col">
        <a-card size="small" class="inner-card metrics-card">
          <div class="metrics-grid">
            <div class="metric-item">
              <a-statistic title="平均任务周期（天）" :value="averageCycleText" />
              <a-typography-text type="secondary">样本：{{ props.insights.completedTaskCount }}</a-typography-text>
            </div>
            <div class="metric-item">
              <a-statistic
                title="拖延指数（%）"
                :value="props.insights.delay.index === null ? '--' : Number(props.insights.delay.index.toFixed(1))"
              />
              <a-progress
                class="delay-progress"
                :percent="props.insights.delay.index === null ? 0 : Number(props.insights.delay.index.toFixed(1))"
                :status="delayStatus(props.insights.delay.index)"
                :show-info="false"
                size="small"
              />
              <a-typography-text type="secondary">
                平均偏差：{{ averageDeviationText }}（样本 {{ props.insights.delay.sampleCount }}）
              </a-typography-text>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-card size="small" class="inner-card project-card" title="各清单任务分布与完成情况">
      <a-empty v-if="props.insights.projectProgress.length === 0" description="暂无项目任务数据" />

      <div v-else class="project-list">
        <div v-for="item in props.insights.projectProgress" :key="item.projectId" class="project-item">
          <div class="project-top">
            <strong>{{ item.projectName }}</strong>
            <span>任务 {{ item.completed }}/{{ item.total }} · 逾期 {{ item.overdue }}</span>
          </div>

          <div class="project-progress-head">
            <span>任务进度</span>
            <span>{{ item.completed }}/{{ item.total }}</span>
          </div>
          <a-progress :percent="Number(item.completionRate.toFixed(1))" size="small" />

          <div class="project-progress-head">
            <span>子任务进度</span>
            <span>{{ item.completedSubtasks }}/{{ item.totalSubtasks }}</span>
          </div>
          <a-progress :percent="Number(item.subtaskCompletionRate.toFixed(1))" size="small" />
        </div>
      </div>
    </a-card>
  </a-card>
</template>

<style scoped>
.insight-card {
  border-radius: 16px;
}

.head {
  margin-bottom: 12px;
}

.head h2 {
  margin: 0;
  font-size: 20px;
}

.inner-card {
  border-radius: 12px;
  background: #ffffff;
}

.overview-col + .overview-col {
  margin-top: 2px;
}

.metrics-card {
  border: 1px solid rgba(155, 89, 182, 0.12);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.06), rgba(255, 255, 255, 0.9));
}

.trend-list {
  display: grid;
  gap: 10px;
}

.trend-item {
  display: grid;
  gap: 4px;
}

.trend-top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #5e4f69;
}

.delay-progress {
  margin: 6px 0 2px;
}

.project-card {
  margin-top: 12px;
}

.project-list {
  display: grid;
  gap: 8px;
}

.project-item {
  display: grid;
  gap: 4px;
}

.project-top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #5e4f69;
}

.project-progress-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #7a6c86;
}

@media (max-width: 640px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}

:deep(.app-layout.dark-mode .insight-card) {
  background: #1a2331 !important;
  border: 1px solid #2a3445;
}

:deep(.app-layout.dark-mode .insight-card > .ant-card-body) {
  background: #1a2331 !important;
}

:deep(.app-layout.dark-mode .insight-card .inner-card) {
  background: #141d29 !important;
  border: 1px solid #2a3445;
}

:deep(.app-layout.dark-mode .insight-card .metrics-card) {
  border-color: #3a4861 !important;
}

:deep(.app-layout.dark-mode .insight-card .metric-item) {
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.18), rgba(26, 35, 49, 0.88)) !important;
}

:deep(.app-layout.dark-mode .insight-card .inner-card > .ant-card-body),
:deep(.app-layout.dark-mode .insight-card .inner-card > .ant-card-head) {
  background: #141d29 !important;
}

:deep(.app-layout.dark-mode .insight-card .inner-card > .ant-card-head) {
  border-bottom-color: #2a3445;
}

:deep(.app-layout.dark-mode .insight-card .head h2),
:deep(.app-layout.dark-mode .insight-card .trend-top),
:deep(.app-layout.dark-mode .insight-card .project-top),
:deep(.app-layout.dark-mode .insight-card .ant-typography),
:deep(.app-layout.dark-mode .insight-card .ant-statistic-title),
:deep(.app-layout.dark-mode .insight-card .ant-statistic-content),
:deep(.app-layout.dark-mode .insight-card .ant-card-head-title) {
  color: #dce5f0 !important;
}
</style>
