/**
 * 登录状态（全局单例）
 * ------------------------------------------------------------
 * 为什么不用 Pinia？
 *   这个项目只有"当前用户"一份共享状态，为此装一个状态管理库，
 *   等于为了一个抽屉买一套房子。
 *   Vue 3 的 reactive 本身就是响应式的，模块级单例就够用 ——
 *   这也是官方文档里认可的轻量方案。
 *   等到真的出现十几个跨页面的状态，再迁移到 Pinia，那时改动也只在文件内部。
 *
 * 为什么状态定义在模块顶层，而不是 useAuth() 里面？
 *   useAuth() 每次调用都会执行函数体。如果 reactive 写在函数里，
 *   每个组件拿到的就是**各自独立的一份状态** —— 登录页登录成功了，
 *   导航栏还是显示"未登录"。这是最常见的坑。
 *   放在模块顶层，整个应用只有一份，import 到哪都是它。
 */
import { computed, reactive } from 'vue'
import { fetchMe, login, logout, register, type RegisterInput } from '../api/auth'
import type { AuthUser } from '../types'

/**
 * idle    —— 还没开始探测
 * probing —— 正在问后端（界面上不该显示"登录"按钮，因为可能马上就变成用户名）
 * ready   —— 问到了结果（user 可能为 null，表示确实没登录）
 * offline —— 问不到（后端没起 / 断网）。这时**不能**断定用户没登录
 */
export type AuthStatus = 'idle' | 'probing' | 'ready' | 'offline'

const state = reactive<{
  user: AuthUser | null
  status: AuthStatus
}>({
  user: null,
  status: 'idle',
})

/**
 * 探测只跑一次的凭证
 * ------------------------------------------------------------
 * 首页、导航栏、文章页可能同时挂载，如果每个都调一次 /auth/me，
 * 首屏就会并发打出好几个一样的请求。
 * 用模块级变量缓存这个 Promise，所有调用方共享同一次请求。
 */
let probePromise: Promise<void> | null = null

/**
 * 启动时探测登录态
 * ------------------------------------------------------------
 * ⚠️ 调用方**不要 await 它**再挂载应用。
 *   后端没起时探测要等满 8 秒超时，await 会让用户盯着白屏 8 秒。
 *   正确做法：先渲染，让它在后台跑，结果回来时界面自动更新。
 */
export function initAuth(): Promise<void> {
  if (probePromise) return probePromise

  state.status = 'probing'

  probePromise = fetchMe()
    .then((user) => {
      state.user = user
      state.status = 'ready'
    })
    .catch(() => {
      // 只有网络层失败会走到这里（401 已经被 fetchMe 转成 null 了）
      state.user = null
      state.status = 'offline'
      // 不弹全局提示：首页本来就有"本地演示数据"的降级说明，
      // 再弹一个红条只会让第一次打开的人以为网站坏了
      console.warn('[auth] 无法获取登录状态，后端可能未启动')
    })

  return probePromise
}

/** 登录 */
export async function signIn(email: string, password: string): Promise<AuthUser> {
  const user = await login({ email, password })
  state.user = user
  state.status = 'ready'
  return user
}

/** 注册（后端注册成功即登录，不用再调一次登录接口） */
export async function signUp(input: RegisterInput): Promise<AuthUser> {
  const user = await register(input)
  state.user = user
  state.status = 'ready'
  return user
}

/**
 * 登出
 * 无论后端是否确认成功，本地状态都要清空。
 * 否则用户点了"退出"却还看到自己的名字，会以为按钮坏了。
 */
export async function signOut(): Promise<boolean> {
  const confirmed = await logout()
  state.user = null
  state.status = 'ready'
  return confirmed
}

/** 已登录？注意 offline 状态下它是 false —— 界面按未登录处理，这是可接受的降级 */
const isLoggedIn = computed(() => state.user !== null)

/** 有发文权限？（后端仍会二次校验，这里只决定界面显不显示入口） */
const canWrite = computed(() => state.user?.isAuthor === true)

/**
 * 组件里用这个
 * 注意返回的 state 是响应式对象，直接读 `auth.state.user` 会随状态更新
 */
export function useAuth() {
  return {
    state,
    isLoggedIn,
    canWrite,
    signIn,
    signUp,
    signOut,
    initAuth,
  }
}
