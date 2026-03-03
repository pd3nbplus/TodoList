import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    Components({
      dts: 'src/components.d.ts',
      resolvers: [
        AntDesignVueResolver({ importStyle: false }),
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
        cssnano({ preset: 'default' }),
      ],
    },
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }
          if (id.includes('ant-design-vue')) {
            return 'vendor-antdv'
          }
          if (id.includes('@ant-design/icons-vue')) {
            return 'vendor-antdv-icons'
          }
          if (id.includes('vue-router')) {
            return 'vendor-vue-router'
          }
          if (id.includes('pinia')) {
            return 'vendor-pinia'
          }
          return 'vendor'
        },
      },
    },
  },
})
