<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApartmentOutlined, HomeOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)

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

const themeConfig = {
  token: {
    colorPrimary: '#9b59b6',
    colorInfo: '#9b59b6',
    colorLink: '#8e44ad',
    borderRadius: 12,
    fontSize: 14,
  },
}

function onMenuClick({ key }: { key: string }) {
  if (key !== route.path) {
    void router.push(key)
  }
}
</script>

<template>
  <a-config-provider :theme="themeConfig">
    <a-layout class="app-layout">
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
            <small>V1.0.1</small>
          </div>
        </div>

        <a-menu
          mode="inline"
          class="nav-menu"
          :items="menuItems"
          :selected-keys="selectedKeys"
          @click="onMenuClick"
        />
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
  overflow: auto;
}

.app-main {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
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

@media (max-width: 900px) {
  .app-content {
    padding: 10px;
  }
}
</style>
