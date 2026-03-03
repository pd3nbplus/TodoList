/// <reference types="vite/client" />

declare module 'vue-virtual-scroller' {
  import type { DefineComponent } from 'vue'

  type GenericComponent = DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    Record<string, unknown>
  >

  export const DynamicScroller: GenericComponent
  export const DynamicScrollerItem: GenericComponent
}
