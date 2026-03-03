import { test, expect } from '@playwright/test'

test('visits the app root url', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('任务画布')
})

test('enables virtual scrolling when tasks exceed threshold', async ({ page }) => {
  await page.addInitScript(() => {
    const now = '2026-03-04T00:00:00.000Z'
    const tasks = Array.from({ length: 60 }, (_, index) => ({
      id: `task-${index}`,
      title: `虚拟任务 ${index}`,
      description: '',
      completed: false,
      priority: 'medium',
      dueDate: null,
      projectId: 'inbox',
      subtasks: [],
      manualOrder: index + 1,
      createdAt: now,
      updatedAt: now,
    }))

    const projects = [
      {
        id: 'inbox',
        name: '默认清单',
        createdAt: now,
      },
    ]

    localStorage.setItem('todo-list-state-v1', JSON.stringify({
      version: 1,
      tasks,
      projects,
    }))
  })

  await page.goto('/')

  const virtualContainer = page.locator('.task-list.task-list-virtual-enabled')
  await expect(virtualContainer).toBeVisible()

  const firstTask = page.locator('[data-task-id="task-0"]')
  const lastTask = page.locator('[data-task-id="task-59"]')
  await expect(firstTask).toBeVisible()
  await expect(lastTask).toHaveCount(0)

  await virtualContainer.evaluate((node) => {
    node.scrollTop = node.scrollHeight
  })

  await expect(lastTask).toBeVisible()
})

test('keeps keyboard navigation working across virtualized items', async ({ page }) => {
  await page.addInitScript(() => {
    const now = '2026-03-04T00:00:00.000Z'
    const tasks = Array.from({ length: 60 }, (_, index) => ({
      id: `task-${index}`,
      title: `键盘任务 ${index}`,
      description: '',
      completed: false,
      priority: 'medium',
      dueDate: null,
      projectId: 'inbox',
      subtasks: [],
      manualOrder: index + 1,
      createdAt: now,
      updatedAt: now,
    }))

    const projects = [
      {
        id: 'inbox',
        name: '默认清单',
        createdAt: now,
      },
    ]

    localStorage.setItem('todo-list-state-v1', JSON.stringify({
      version: 1,
      tasks,
      projects,
    }))
  })

  await page.goto('/')

  const virtualContainer = page.locator('.task-list.task-list-virtual-enabled')
  await expect(virtualContainer).toBeVisible()

  await virtualContainer.evaluate((node) => {
    node.scrollTop = node.scrollHeight
  })

  const highIndexTask = page.locator('[data-task-id="task-55"]')
  await expect(highIndexTask).toBeVisible()
  await highIndexTask.focus()

  await page.keyboard.press('ArrowUp')

  await page.waitForFunction(() => {
    const taskId = document.activeElement?.getAttribute('data-task-id')
    return taskId === 'task-54'
  })
})
