import { describe, it, expect } from 'vitest'
import {
  validateUsername,
  validateEmail,
  validateNewPassword,
  validateConfirmPassword,
  validateCoverPath,
  validateArticleForm,
  compactErrors,
  type ArticleFormValues,
} from './validators'

describe('validateUsername', () => {
  it('空 / 过短 / 过长 / 非法字符 各自报错', () => {
    expect(validateUsername('')).toBe('用户名不能为空')
    expect(validateUsername('a')).toBe('用户名至少 2 个字符')
    expect(validateUsername('a'.repeat(21))).toBe('用户名最多 20 个字符')
    expect(validateUsername('ab!')).toBe('用户名只能包含中文、字母、数字和下划线')
  })
  it('合法用户名返回空串（含自动 trim）', () => {
    expect(validateUsername(' 张三_01 ')).toBe('')
  })
})

describe('validateEmail', () => {
  it('空和非法格式报错', () => {
    expect(validateEmail('')).toBe('邮箱不能为空')
    expect(validateEmail('abc')).toBe('邮箱格式不正确')
    expect(validateEmail('a@b')).toBe('邮箱格式不正确')
  })
  it('合法邮箱通过', () => {
    expect(validateEmail('a@b.com')).toBe('')
  })
})

describe('validateNewPassword', () => {
  it('边界：5 位报错、6 位通过、65 位报错', () => {
    expect(validateNewPassword('12345')).toBe('密码至少 6 位')
    expect(validateNewPassword('123456')).toBe('')
    expect(validateNewPassword('a'.repeat(65))).toBe('密码最多 64 位')
  })
})

describe('validateConfirmPassword', () => {
  it('不一致报错，一致通过', () => {
    expect(validateConfirmPassword('a', 'b')).toBe('两次输入的密码不一致')
    expect(validateConfirmPassword('a', 'a')).toBe('')
  })
})

describe('validateCoverPath', () => {
  it('空值允许（封面可选）', () => {
    expect(validateCoverPath('')).toBe('')
  })
  it('站内路径通过，外链和目录穿越被拒', () => {
    expect(validateCoverPath('/uploads/covers/abc.png')).toBe('')
    expect(validateCoverPath('http://x.com/a.png')).toBe('封面必须是上传接口返回的路径')
    expect(validateCoverPath('/uploads/covers/../a.png')).toBe('封面必须是上传接口返回的路径')
  })
})

describe('validateArticleForm', () => {
  const base: ArticleFormValues = {
    title: '标题',
    content: '正文',
    excerpt: '',
    tags: [],
    year: 2026,
    issue: 1,
  }
  it('合法表单返回空对象', () => {
    expect(validateArticleForm(base)).toEqual({})
  })
  it('标题/正文空、年份越界、标签超额 各自报错', () => {
    expect(validateArticleForm({ ...base, title: '' }).title).toBe('标题不能为空')
    expect(validateArticleForm({ ...base, content: '' }).content).toBe('正文不能为空')
    expect(validateArticleForm({ ...base, year: 1800 }).year).toBe('年份不合理')
    expect(validateArticleForm({ ...base, tags: ['a', 'b', 'c', 'd', 'e', 'f'] }).tags).toBe(
      '标签最多 5 个',
    )
  })
})

describe('compactErrors', () => {
  it('去掉空值错误项，避免空字符串假象', () => {
    expect(compactErrors({ email: '', title: 'x' })).toEqual({ title: 'x' })
  })
})
