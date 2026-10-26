/**
 * 认证接口
 * ------------------------------------------------------------
 * 后端四个接口：
 *   POST /auth/register  注册（成功直接下发 cookie，不用再登录一次）
 *   POST /auth/login     登录
 *   POST /auth/logout    登出（必须由后端清 cookie）
 *   GET  /auth/me        当前用户 —— 前端判断登录态的唯一方式
 *
 * ⚠️ 为什么判断登录态必须调 /auth/me，不能在本地存个 flag？
 *   token 存在 httpOnly cookie 里，**页面 JS 读不到**（这是故意的，防 XSS 偷 token）。
 *   所以前端无法自己知道"我有没有登录"，只能问后端。
 *   浏览器会在请求时自动带上 cookie，后端验证通过就 200，不通过就 401。
 *
 *   好处是：用户清了浏览器数据、token 过期、在别的标签页登出，
 *   刷新后状态都自动是对的 —— 本地 flag 做不到这一点。
 */
import { request, ApiError } from './client'
import { toAuthUser, type AuthUserDto } from './adapters'
import type { AuthUser, UserRole } from '../types'

/** 后端返回的 data 形状 */
interface AuthPayload {
  user: AuthUserDto
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  role?: UserRole
}

/**
 * 登录
 * 失败时抛 ApiError：
 *   code 40002 → 账号或密码错误（后端故意不区分是哪个错，防止探测邮箱是否存在）
 *   code 40001 → 参数格式问题
 */
export async function login(input: LoginInput): Promise<AuthUser> {
  const data = await request<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: input.email, password: input.password }),
  })

  return toAuthUser(data.user)
}

/**
 * 注册
 * 后端会根据 ALLOW_SELF_AUTHOR 开关决定最终角色：
 * 开关关掉时，前端传 author 也会被强制降级成 reader（服务端说了算）
 */
export async function register(input: RegisterInput): Promise<AuthUser> {
  const body: Record<string, unknown> = {
    username: input.username,
    email: input.email,
    password: input.password,
  }
  // 没指定角色就不传这个字段，让后端用默认值。
  // 传 null 会被 zod 拒绝（role 只接受 'reader' | 'author'）
  if (input.role) body.role = input.role

  const data = await request<AuthPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return toAuthUser(data.user)
}

/**
 * 登出
 * ------------------------------------------------------------
 * 这里**故意不抛错**。
 * 原因：登出接口要求登录态。如果 token 刚好过期，后端返回 401，
 * 此时用户的心智是"我要退出"，而不是"退出失败了"。
 * 所以无论后端说什么，前端都应该把本地状态清掉。
 * 调用方（store）拿到 false 只用来决定要不要提示，不影响退出动作。
 *
 * @returns 后端是否确认登出成功
 */
export async function logout(): Promise<boolean> {
  try {
    await request<null>('/auth/logout', { method: 'POST' })
    return true
  } catch {
    return false
  }
}

/**
 * 查当前登录用户
 * ------------------------------------------------------------
 * @returns 已登录返回用户；未登录返回 null
 * @throws  网络层面的错误（后端没起、断网、超时）会往上抛
 *
 * 为什么要区分「未登录」和「问不到」？
 *   两者在界面上要做的事完全不同：
 *     未登录 → 显示"登录 / 注册"按钮，这是正常状态
 *     问不到 → 后端挂了，需要提示用户"服务不可用"，
 *              否则用户会以为自己被登出了，反复重新登录
 */
export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const data = await request<AuthPayload>('/auth/me')
    return toAuthUser(data.user)
  } catch (err) {
    // 401 是我们预期的「没登录」，转成 null 交给上层当正常状态处理。
    // 40001 之类的参数错误也归到这里：对界面来说都是"没有有效登录态"
    if (err instanceof ApiError && (err.status === 401 || err.code === 40101 || err.code === 40102)) {
      return null
    }
    // code === -1 是网络层失败，必须继续往上抛，不能伪装成"未登录"
    throw err
  }
}
