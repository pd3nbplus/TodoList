import { beforeAll, describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import App from '../App.vue'
import router from '../router'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('App', () => {
  it('renders dashboard sections', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [Antd, router],
      },
    })

    expect(wrapper.text()).toContain('任务画布')
    expect(wrapper.text()).toContain('添加任务')
  })
})
