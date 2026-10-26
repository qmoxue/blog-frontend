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
      component: () => import('../pages/StubPage.vue'),
      meta: { title: '登录', note: '账号接口已经就绪（注册 / 登录 / 登出 / 当前用户），登录页在下一步接入。' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../pages/StubPage.vue'),
      meta: { title: '注册', note: '账号接口已经就绪，注册页在下一步接入。' },
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
