/**
 * 表单校验规则
 * ------------------------------------------------------------
 * ⚠️ 这里的规则是**后端 src/validators/auth.validator.js 的镜像**，
 *    连提示文案都刻意保持一致。
 *
 * 为什么要抄一遍，不让后端一个人干？
 *   后端校验是「唯一权威」，但它只能在提交之后告诉你错了。
 *   前端这一份只为了"即时反馈"：输入框失焦就提示，不用等一次网络往返。
 *
 * 为什么文案要一模一样？
 *   否则同一条规则用户会看到两种说法：
 *     前端："用户名太短了"
 *     后端："用户名至少 2 个字符"
 *   用户会以为是两个不同的问题。
 *
 * 维护约定：改后端规则时，这个文件必须同步改。
 *   两边不一致的后果不是安全问题（后端仍然会拦），
 *   而是"前端放行、后端报错"的糟糕体验。
 */
import type { UserRole } from '../types'

/** 用户名：2–20 个字符，只允许中文、字母、数字、下划线 */
const USERNAME_RE = /^[\w\u4e00-\u9fa5]+$/

/**
 * 邮箱
 * ------------------------------------------------------------
 * 不用 RFC 5322 的完整正则 —— 那玩意儿几百个字符，还是有漏网的。
 * 这里只拦明显不对的输入（没有 @、没有域名、域名没有点），
 * 真正的判断交给后端和"能不能收到邮件"这件事本身。
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 返回空字符串表示通过，这样调用处可以统一写 `if (err)` */
export function validateUsername(value: string): string {
  const v = value.trim()
  if (!v) return '用户名不能为空'
  if (v.length < 2) return '用户名至少 2 个字符'
  if (v.length > 20) return '用户名最多 20 个字符'
  if (!USERNAME_RE.test(v)) return '用户名只能包含中文、字母、数字和下划线'
  return ''
}

export function validateEmail(value: string): string {
  const v = value.trim()
  if (!v) return '邮箱不能为空'
  if (!EMAIL_RE.test(v)) return '邮箱格式不正确'
  return ''
}

/** 登录时的密码：只校验非空。规则放宽是因为老账号可能不满足新规则，不能把人挡在门外 */
export function validateLoginPassword(value: string): string {
  if (!value) return '密码不能为空'
  return ''
}

/** 注册时的密码：和后端一致，6–64 位 */
export function validateNewPassword(value: string): string {
  if (!value) return '密码不能为空'
  if (value.length < 6) return '密码至少 6 位'
  if (value.length > 64) return '密码最多 64 位'
  return ''
}

/** 确认密码：纯前端概念，后端没有这个字段 */
export function validateConfirmPassword(value: string, original: string): string {
  if (!value) return '请再输入一次密码'
  if (value !== original) return '两次输入的密码不一致'
  return ''
}

export function validateRole(value: UserRole | ''): string {
  if (!value) return '请选择身份'
  return ''
}

/** 表单字段 → 错误文案。全部通过时返回空对象 */
export type FieldErrors = Partial<Record<string, string>>

/** 去掉空值的错误项，避免 `{ email: '' }` 这种"有 key 但没错误"的假象 */
export function compactErrors(errors: FieldErrors): FieldErrors {
  const result: FieldErrors = {}
  for (const [key, message] of Object.entries(errors)) {
    if (message) result[key] = message
  }
  return result
}
