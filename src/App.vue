<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApartmentOutlined, HomeOutlined } from '@ant-design/icons-vue'
import { theme as antdTheme } from 'ant-design-vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const darkMode = ref(false)
const THEME_STORAGE_KEY = 'todo-theme-mode'

const menuItems = [
  {
    key: '/',
    icon: () => h(HomeOutlined),
    label: '首页',
  },
  {
    key: '/timeline',
    icon: () => h(ApartmentOutlined),
    label: '任务时序图',
  },
]

const selectedKeys = computed(() => {
  if (route.path.startsWith('/timeline')) {
    return ['/timeline']
  }

  return ['/']
})

const themeConfig = computed(() => ({
  algorithm: darkMode.value ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#9b59b6',
    colorInfo: '#9b59b6',
    colorLink: '#8e44ad',
    borderRadius: 12,
    fontSize: 14,
  },
}))

function onMenuClick({ key }: { key: string }) {
  if (key !== route.path) {
    void router.push(key)
  }
}

function applyGlobalThemeClass(enabled: boolean) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('app-dark', enabled)
  document.body.classList.toggle('app-dark', enabled)
}

onMounted(() => {
  if (typeof localStorage === 'undefined') {
    return
  }

  darkMode.value = localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
  applyGlobalThemeClass(darkMode.value)
})

watch(darkMode, (value) => {
  if (typeof localStorage === 'undefined') {
    applyGlobalThemeClass(value)
    return
  }

  localStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light')
  applyGlobalThemeClass(value)
})
</script>

<template>
  <a-config-provider :theme="themeConfig">
    <a-layout class="app-layout" :class="{ 'dark-mode': darkMode }">
      <a-layout-sider
        v-model:collapsed="collapsed"
        width="236"
        :collapsed-width="76"
        class="app-sider"
      >
        <div class="brand" :class="{ collapsed }">
          <div class="dot"></div>
          <div class="text">
            <strong>TodoList</strong>
            <small>V1.0.2</small>
          </div>
        </div>

        <a-menu
          mode="inline"
          class="nav-menu"
          :items="menuItems"
          :selected-keys="selectedKeys"
          @click="onMenuClick"
        />

        <div class="theme-toggle" :class="{ collapsed }">
          <span v-if="!collapsed">深色模式</span>
          <a-switch v-model:checked="darkMode" />
        </div>
      </a-layout-sider>

      <a-layout class="app-main">
        <a-layout-header class="app-header">
          <a-space>
            <a-button type="text" @click="collapsed = !collapsed">
              {{ collapsed ? '展开导航' : '收起导航' }}
            </a-button>
            <a-typography-text type="secondary">
              当前页面：{{ selectedKeys[0] === '/' ? '首页' : '任务时序图' }}
            </a-typography-text>
          </a-space>
        </a-layout-header>

        <a-layout-content class="app-content">
          <router-view />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  background: #f6eefb;
  overflow: hidden;
}

.app-sider {
  background: linear-gradient(180deg, #5f2a7a, #7f3b96 40%, #9b59b6 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.16);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.app-sider :deep(.ant-layout-sider-children) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.app-main {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.theme-toggle {
  margin: 10px 12px 12px;
  margin-top: auto;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: #f8eeff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.theme-toggle.collapsed {
  justify-content: center;
}

.app-sider .theme-toggle {
  margin-top: auto !important;
}

.brand {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f9f1ff;
}

.brand.collapsed .text {
  display: none;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f8b500;
  box-shadow: 0 0 0 4px rgba(248, 181, 0, 0.22);
}

.text {
  display: grid;
  line-height: 1.1;
}

.text small {
  opacity: 0.86;
}

.nav-menu {
  background: transparent;
  border-inline-end: none;
  color: #f4e8ff;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

:deep(.ant-menu-item-selected) {
  background: rgba(255, 255, 255, 0.2) !important;
}

:deep(.ant-menu-item .anticon),
:deep(.ant-menu-item) {
  color: #f7ebff !important;
}

.app-header {
  height: 64px;
  line-height: 64px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid #e8dbf2;
  padding: 0 18px;
}

.app-content {
  height: calc(100vh - 64px);
  overflow: auto;
  padding: 12px;
  background: #f6eefb;
}

.app-layout.dark-mode {
  background: #10141c;
}

.app-layout.dark-mode .app-sider {
  background: linear-gradient(180deg, #20162a, #352042 45%, #4c2f60 100%);
  border-right-color: rgba(255, 255, 255, 0.08);
}

.app-layout.dark-mode .app-header {
  background: #141a23;
  border-bottom-color: #2b3140;
}

.app-layout.dark-mode .app-content {
  background: #0f1520;
}

.app-layout.dark-mode .theme-toggle {
  background: rgba(255, 255, 255, 0.1);
}

:deep(.app-layout.dark-mode .todo-page) {
  background: radial-gradient(circle at top, #1f2330, #121924 46%, #0f1621 100%);
}

:deep(.app-layout.dark-mode .ant-card) {
  background: #171f2c;
  color: #e9edf4;
}

:deep(.app-layout.dark-mode .ant-typography),
:deep(.app-layout.dark-mode .ant-statistic-title),
:deep(.app-layout.dark-mode .ant-statistic-content) {
  color: #d8deea;
}

@media (max-width: 900px) {
  .app-content {
    padding: 10px;
  }
}
</style>
