/**
 * 路由表
 * ------------------------------------------------------------
 * 为什么用 hash 模式（URL 里带 #）而不是 history 模式？
 *
 *   这个项目有三种运行方式，只有 hash 模式能同时满足：
 *     1. npm run dev          —— 开发服务器
 *     2. Nginx 托管 dist      —— 生产
 *     3. 双击 dist-standalone/index.html —— 单文件产物，file:// 协议
 *
 *   history 模式需要服务器把「所有路径都回落到 index.html」。
 *   Nginx 配一行 try_files 就行，但 **file:// 协议没有服务器**，
 *   单文件版里点开文章会直接 404。
 *
 *   代价是 URL 变成 #/article/xxx 这种样子。
 *   如果以后确定只走服务器部署，改 createWebHashHistory → createWebHistory，
 *   再把 vite.config.ts 的 base 改成 '/' 即可（Nginx 模板已经配好 try_files）。
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'

/**
 * 登录后跳哪儿的「安全版」
 * ------------------------------------------------------------
 * 登录页会接受 ?redirect=/editor 这种参数，登录成功后跳回去。
 * 但**绝对不能**直接把参数丢给 router.push：
 *
 *   ?redirect=https://evil.com   → 用户在我们的域名下登录完，被送去钓鱼站
 *   ?redirect=//evil.com        → 同上，协议相对地址，浏览器会当成外部域名
 *
 * 这类漏洞叫「开放重定向（open redirect）」，是钓鱼的经典手法：
 * 链接前半段是真实域名，用户不会怀疑。
 *
 * 所以只允许站内路径：必须以单个 / 开头。
 */
export function safeRedirect(raw: unknown, fallback = '/'): string {
  if (typeof raw !== 'string') return fallback

  const value = raw.trim()
  if (!value) return fallback

  // 必须站内绝对路径
  if (!value.startsWith('/')) return fallback
  // 排除 //evil.com 和 /\evil.com（后者部分浏览器也会解析成外部地址）
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback

  return value
}

export const router = createRouter({
  history: createWebHashHistory(),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/article/:id',
      name: 'article',
      // 懒加载：详情页的 Markdown 渲染器不小，首屏用不到就不要打进主包
      component: () => import('../pages/ArticlePage.vue'),
      // props: true 把路由参数作为 prop 传进组件，
      // 组件就不用 useRoute() 去读，测试时可以直接传 props
      props: true,
    },
    {
      path: '/login',
      name: 'login',
      // 懒加载：登录页只在点进来时才下载，不占首屏体积
      component: () => import('../pages/LoginPage.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/RegisterPage.vue'),
    },
    {
      // 兜底：匹配不到任何路由时
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../pages/StubPage.vue'),
      meta: { title: '这一页不存在', note: '链接可能已经失效，或者地址打错了。' },
    },
  ],

  /**
   * 切换路由后的滚动位置
   * 没有这个的话，从长列表点进文章，详情页会停在页面中间
   */
  scrollBehavior(_to, _from, savedPosition) {
    // 浏览器后退时恢复原来的滚动位置，这是用户预期
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})
