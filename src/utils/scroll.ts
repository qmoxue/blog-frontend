/**
 * 页内滚动
 * ------------------------------------------------------------
 * 为什么不能直接用 `<a href="#about">`？
 *   项目用的是 hash 路由，URL 里的 `#` 已经被 vue-router 占用了。
 *   点 `href="#about"` 会把地址栏改成 `#about`，
 *   路由把这当成「访问 /about」，匹配不到任何页面 → 掉进 404。
 *
 *   这个坑我踩了两次：第一次在导航栏，第二次在页脚和专栏卡片。
 *   所以抽成工具函数，以后新增入口时统一调它，别再写 href="#xxx"。
 */
import { nextTick } from 'vue'
import type { Router } from 'vue-router'

/**
 * 滚动到当前页面的某个区块
 * 元素不存在时静默返回 —— 例如在文章页想滚到只在首页存在的 #archive，
 * 不应该报错，也不应该白屏
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return

  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * 回到首页并滚动到指定区块
 * 当前已经在首页时，跳过路由跳转，直接滚
 *
 * @param currentPath 当前路由路径（route.path）
 */
export async function goToHomeSection(router: Router, currentPath: string, id: string): Promise<void> {
  if (currentPath !== '/') {
    await router.push('/')
    await nextTick()
    // 等一帧：首页卡片挂载后高度才确定，否则滚动位置会算错，
    // 表现为"滚过去了但停偏了几百像素"
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }

  scrollToSection(id)
}
