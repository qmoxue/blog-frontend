import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 后端端口
 * ------------------------------------------------------------
 * 从 `.env` 里读 VITE_API_PORT，读不到就用默认 8080。
 *
 * 为什么用 loadEnv 而不是直接读 process.env：
 *   Vite 的 .env 文件**不会**自动进 process.env，必须显式 loadEnv 才读得到。
 *   而 loadEnv 会同时收拢「.env 文件里的」和「shell 里的」VITE_ 变量，
 *   且 shell 优先 —— 所以临时换端口 `VITE_API_PORT=9000 npm run dev` 也能生效。
 *
 * 它必须和后端 .env 里的 PORT 一致。
 * 不一致时的症状很有迷惑性：页面能开、样式正常，但所有接口都失败，
 * 控制台刷 `http proxy error: connect ECONNREFUSED 127.0.0.1:<端口>`，
 * 看起来像"后端挂了"，实际是代理打错了门。
 */
export default defineConfig(({ mode }) => {
  // envDir 传 '.' 而不是 process.cwd()：
  //   两者等价（loadEnv 内部会对 envDir 做 path.resolve，基准就是 cwd），
  //   但本项目没装 @types/node，而 vite.config.ts 也在 vue-tsc 的检查范围内，
  //   直接引用 process 会报 TS2591。
  const env = loadEnv(mode, '.', 'VITE_')
  const API_PORT = env.VITE_API_PORT || '8080'

  return {
    plugins: [vue()],
    base: './',
    server: {
      port: 5173,
      host: '127.0.0.1',
      /**
       * 开发代理
       * ------------------------------------------------------------
       * 为什么需要它？
       *   前端跑在 5173，后端跑在 API_PORT（默认 8080），
       *   浏览器直接请求后端端口就是「跨域」：
       *   1. 跨域请求默认不带 cookie，登录态永远建立不起来；
       *   2. 后端就算开了 CORS，也要处理预检、白名单，麻烦且容易出错。
       *
       *   代理让浏览器只跟 5173 说话，由 Vite 在服务端转发到后端端口。
       *   浏览器视角是「同源」，跨域和 cookie 问题直接消失。
       *
       *   所以前端代码里的请求地址要写相对路径 /api/v1/...，
       *   生产环境由 Nginx 做同样的事，代码一行都不用改。
       */
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${API_PORT}`,
          changeOrigin: true,
        },
        // 封面图也要代理。图片路径是 /uploads/covers/xxx.png，
        // 不代理的话浏览器会去 5173 找这个文件，得到 404 → 走降级占位
        '/uploads': {
          target: `http://127.0.0.1:${API_PORT}`,
          changeOrigin: true,
        },
      },
    },
  }
})
