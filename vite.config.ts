import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1',
    /**
     * 开发代理
     * ------------------------------------------------------------
     * 为什么需要它？
     *   前端跑在 5173，后端跑在 3000，浏览器直接请求 3000 就是「跨域」：
     *   1. 跨域请求默认不带 cookie，登录态永远建立不起来；
     *   2. 后端就算开了 CORS，也要处理预检、白名单，麻烦且容易出错。
     *
     *   代理让浏览器只跟 5173 说话，由 Vite 在服务端转发到 3000。
     *   浏览器视角是「同源」，跨域和 cookie 问题直接消失。
     *
     * 所以前端代码里的请求地址要写相对路径 /api/v1/...，
     * 生产环境由 Nginx 做同样的事，代码一行都不用改。
     */
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // 封面图也要代理。图片路径是 /uploads/covers/xxx.png，
      // 不代理的话浏览器会去 5173 找这个文件，得到 404 → 走降级占位
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
