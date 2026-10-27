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

// ------------------------------------------------------------------
// 文章表单（镜像后端 article.validator.js）
// ------------------------------------------------------------------

/** 文章表单的值。tags 用数组，界面上的"逗号分隔输入框"在页面里转换 */
export interface ArticleFormValues {
  title: string
  content: string
  excerpt: string
  tags: string[]
  year: number
  issue: number
}

/**
 * 封面只允许站内上传路径
 * ------------------------------------------------------------
 * 和后端 COVER_PATH 完全一致：禁止 http:// 外链（会被当成图床滥用），
 * 也禁止 ../ 目录穿越。
 */
const COVER_RE = /^\/uploads\/covers\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/

export function validateCoverPath(value: string): string {
  if (!value) return '' // 封面可选
  return COVER_RE.test(value) ? '' : '封面必须是上传接口返回的路径'
}

/**
 * 校验整张文章表单
 * @param values 表单值
 * @returns 字段 → 错误文案；全部通过返回空对象
 */
export function validateArticleForm(values: ArticleFormValues): FieldErrors {
  const errors: FieldErrors = {}

  const title = values.title.trim()
  if (!title) errors.title = '标题不能为空'
  else if (title.length < 2) errors.title = '标题至少 2 个字符'
  else if (title.length > 120) errors.title = '标题最多 120 个字符'

  const content = values.content.trim()
  if (!content) errors.content = '正文不能为空'
  else if (content.length > 50000) errors.content = '正文最多 50000 个字符'

  if (values.excerpt.trim().length > 200) errors.excerpt = '摘要最多 200 个字符'

  if (values.tags.length > 5) errors.tags = '标签最多 5 个'
  else if (values.tags.some((t) => t.length > 20)) errors.tags = '单个标签最多 20 个字符'

  if (!Number.isInteger(values.year) || values.year < 1900 || values.year > 2100) {
    errors.year = '年份不合理'
  }
  if (!Number.isInteger(values.issue) || values.issue < 1 || values.issue > 999) {
    errors.issue = '期号至少为 1'
  }

  return compactErrors(errors)
}
