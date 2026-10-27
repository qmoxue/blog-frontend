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
import { initAuth, useAuth } from '../stores/auth'

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
      path: '/search',
      name: 'search',
      // 懒加载：搜索页只有点搜索时才用得上，不进首屏包
      component: () => import('../pages/SearchPage.vue'),
      /**
       * 搜索词放 query（/search?q=vue）而不是路由参数。
       * 路由参数（/search/vue）会带来两个麻烦：
       *   1. 空搜索没法表达（/search/ 和 /search 是两条不同的路径）
       *   2. 关键词里有 / 时要编码，URL 会变得很难看
       * query 天生可选、天生可省略，正合适。
       */
      meta: { title: '检索' },
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
      path: '/editor',
      name: 'editor-new',
      // 懒加载：编辑器只有作者会打开，绝不能进首屏包
      component: () => import('../pages/EditorPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/editor/:id',
      name: 'editor-edit',
      component: () => import('../pages/EditorPage.vue'),
      // 编辑已有文章时 id 作为 prop 传进来
      props: true,
      meta: { requiresAuth: true },
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

/**
 * 路由守卫：受保护页面（meta.requiresAuth === true）
 * ------------------------------------------------------------
 * 为什么必须有它，不能只靠页面里 catch 401？
 *   没有守卫时，未登录用户打开 /editor 会先看到完整编辑器界面，
 *   输入一堆内容点保存，才被告知"请先登录"——内容全丢。
 *   守卫在**渲染之前**就把人挡在门外。
 *
 * 这里有两个容易写错的地方：
 *
 * 1. **必须等登录态探测完**
 *    initAuth() 是在 mount 之后才调的（为了不阻塞首屏）。
 *    如果用户直接输入 /editor 打开，守卫跑的时候 status 还是 'idle'，
 *    state.user 是 null —— 直接判断就会把**已登录**的人踢去登录页。
 *
 * 2. **offline 不能当成"未登录"**
 *    后端挂了时问不到登录态。这时踢人去登录页，他会发现登录也登不了，
 *    只能反复刷新。正确做法是放行，由页面说明情况，保存时后端仍会拦。
 */
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth !== true) return true

  const auth = useAuth()

  if (auth.state.status === 'idle' || auth.state.status === 'probing') {
    // initAuth 内部有模块级 Promise 缓存，并发调用也只会发一次请求
    await initAuth()
  }

  if (auth.state.user) return true
  if (auth.state.status === 'offline') return true

  // 带上原地址，登录成功后回跳。safeRedirect 会过滤掉外链
  return { name: 'login', query: { redirect: to.fullPath } }
})
