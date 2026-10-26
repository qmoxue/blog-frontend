/**
 * 把后端错误落到表单上
 * ------------------------------------------------------------
 * 表单提交失败分两种情况，界面上要显示的位置完全不同：
 *
 *   1. 字段级错误（zod 校验没过）
 *      { code: 40001, data: { details: { username: '用户名至少 2 个字符' } } }
 *      → 应该标在对应输入框下面
 *
 *   2. 整体错误（邮箱已注册、密码错误、网络断了）
 *      { code: 40901, message: '该邮箱已被注册' }
 *      → 应该显示在表单顶部
 *
 * 这个函数负责判断该走哪条路，两个页面共用，避免各写一遍写歪。
 */
import { ApiError } from '../api/client'
import type { FieldErrors } from './validators'

export interface SubmitFailure {
  /** 要标到输入框下面的错误 */
  fields: FieldErrors
  /** 要显示在表单顶部的整体错误；空字符串表示不需要显示 */
  message: string
}

/**
 * @param err            catch 到的异常
 * @param allowedFields  这个表单真实存在的字段名。
 *                       后端将来加了字段，或者返回了我们没有的字段名，
 *                       这里会把它过滤掉 —— 否则错误会"凭空消失"
 *                       （存在一个界面上不存在的字段里）
 */
export function toSubmitFailure(err: unknown, allowedFields: string[]): SubmitFailure {
  if (!(err instanceof ApiError)) {
    return { fields: {}, message: '出了点问题，请稍后再试' }
  }

  // 网络层失败（后端没起 / 超时）：code 是 -1，message 已经是人话了
  if (err.code === -1) {
    return { fields: {}, message: err.message }
  }

  if (err.details) {
    const fields: FieldErrors = {}
    const unknown: string[] = []

    for (const [key, message] of Object.entries(err.details)) {
      if (allowedFields.includes(key)) {
        fields[key] = message
      } else {
        // 例如后端返回 { role: '角色只能是 reader 或 author' }
        // 而界面上没有 role 这个输入框
        unknown.push(message)
      }
    }

    // 有字段错误就直接标在框下面，顶部不再重复提示
    if (Object.keys(fields).length > 0) {
      return { fields, message: '' }
    }

    // 全是我们认不出的字段：至少把文案显示出来，不要让用户面对一个没反应的按钮
    return { fields: {}, message: unknown[0] || err.message }
  }

  return { fields: {}, message: err.message }
}
