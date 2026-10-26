import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * 单文件构建：把 JS / CSS / 字体全部内联进一个 index.html，
 * 产物可以双击直接用浏览器打开（file:// 协议下不会被 CORS 拦住）。
 * 常规构建仍走 vite.config.ts。
 */
export default defineConfig({
  plugins: [vue(), viteSingleFile({ removeViteModuleLoader: true })],
  base: './',
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: true,
    // 字体等资源全部内联，避免 file:// 下请求外部文件
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
