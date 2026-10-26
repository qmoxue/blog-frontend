import { createApp } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import { router } from './router'
import { vReveal } from './directives/reveal'
import { initAuth } from './stores/auth'
import './style.css'

const app = createApp(App)

app.use(MotionPlugin)
// 路由要在 mount 之前装好，否则首屏渲染时 RouterView 是空的
app.use(router)
app.directive('reveal', vReveal)
app.mount('#app')

/**
 * 探测登录态
 * ------------------------------------------------------------
 * ⚠️ 放在 mount **之后**，而且不 await。
 *   token 在 httpOnly cookie 里，前端读不到，只能问后端 GET /auth/me。
 *   如果 await 它再挂载，后端没启动时用户要盯着白屏等满 8 秒超时。
 *   现在的顺序是：先出界面 → 结果回来后导航栏自动从占位变成用户名。
 */
initAuth()
