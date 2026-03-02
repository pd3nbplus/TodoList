import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import TodoTimelinePage from '../pages/TodoTimelinePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/timeline',
      name: 'timeline',
      component: TodoTimelinePage,
    },
  ],
})

export default router
