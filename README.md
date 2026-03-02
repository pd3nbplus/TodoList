# TodoList (Vue + Ant Design Vue)

一个组件化的 TodoList Web 应用，基于 Vue 3 + Vite + TypeScript + Ant Design Vue。  
A componentized TodoList web app built with Vue 3 + Vite + TypeScript + Ant Design Vue.

## 版本说明 Version Notes

### v1.0.0 (2026-03-02)

- 首个稳定版本发布，完成 TodoList 核心功能与组件化重构。  
  First stable release with core TodoList features and componentized architecture.
- 基于 Ant Design Vue 的 UI 与 `#9b59b6` 主题落地。  
  Implemented Ant Design Vue UI with `#9b59b6` themed styling.
- 支持主任务与子任务联动完成状态、拖拽排序、筛选搜索、本地持久化与撤销操作。  
  Supports parent/subtask completion sync, drag sort, filtering, search, local persistence, and undo.
- 修复“完成确认弹窗后状态未更新”的克隆异常问题。  
  Fixed clone-exception issue where completion confirmation did not update task state.

## 功能 Features

- 任务管理：新增 / 编辑 / 删除 / 完成状态切换  
  Task management: create / edit / delete / toggle complete state
- 子任务管理：新增 / 删除 / 勾选完成  
  Subtasks: create / delete / mark complete
- 主任务一键完成：点击主任务复选框时，会同步设置所有子任务为完成；取消时会同步取消子任务  
  One-click completion on parent task: toggling parent checkbox also updates all subtasks accordingly
- 项目清单（Projects）分类  
  Project-based task grouping
- 搜索、筛选、排序（状态 / 优先级 / 截止日期 / 手动拖拽）  
  Search, filter, and sort (status / priority / due date / manual drag)
- 本地持久化（localStorage）  
  Local persistence via localStorage
- 撤销操作（Undo Snackbar）  
  Undo support via Snackbar
- 截止日期提醒（浏览器通知）  
  Due-date reminder via browser notifications

## 技术栈 Tech Stack

- Vue 3
- Vite
- TypeScript
- Ant Design Vue
- Vitest
- Playwright

## 目录结构 Project Structure

```text
src/
  components/todo/
    TodoWorkspace.vue
    TodoHeader.vue
    ProjectSidebar.vue
    TaskComposer.vue
    TaskToolbar.vue
    TaskBulkActions.vue
    TaskList.vue
    UndoBar.vue
  composables/
    useTodoList.ts
  types/
    todo.ts
```

## 安装与运行 Setup

```bash
npm install
npm run dev
```

## 构建 Build

```bash
npm run build
```

## 测试 Test

```bash
npm run test:unit
npm run test:e2e
```

## 说明 Notes

- 主题色（Primary Color）为 `#9b59b6`。
- 如果浏览器不支持或未授权通知，提醒功能不会触发。
- 拖拽排序会自动切换到“手动排序”。
