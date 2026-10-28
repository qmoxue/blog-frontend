import { defineConfig } from 'vitest/config'

// 纯逻辑单测，不依赖浏览器 DOM。
// 单独一个配置文件，避免和 vite.config.ts 的 vue 插件 / 代理配置互相干扰。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
