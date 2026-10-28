import { describe, it, expect } from 'vitest'
import {
  toArticle,
  toArticleList,
  toColumn,
  toAuthUser,
  type ArticleDto,
  type ArticleAuthorDto,
  type ArticleColumnDto,
} from './adapters'

const author: ArticleAuthorDto = { id: 'u_123', username: '编辑部' }
const column: ArticleColumnDto = { id: 'c_1', name: '前端', slug: 'frontend' }

function makeDto(overrides: Partial<ArticleDto> = {}): ArticleDto {
  return {
    id: 'a1',
    title: '标题',
    excerpt: '摘要',
    cover: '/uploads/covers/x.png',
    tags: ['vue'],
    readTime: 8,
    views: 100,
    year: 2026,
    issue: 3,
    publishedAt: '2026-10-01T00:00:00.000Z',
    author,
    column,
    ...overrides,
  }
}

describe('toArticle', () => {
  it('将 DTO 映射为视图模型，且不携带后端字段', () => {
    const a = toArticle(makeDto())
    expect(a.id).toBe('a1')
    expect(a.title).toBe('标题')
    expect(a.category).toBe('前端') // 专栏名当分类
    expect(a.readTime).toBe('8 分钟阅读')
    expect(a.type).toBe('wide') // 第 0 篇 → 横版
    // 防腐层：后端字段不应泄漏到视图模型，否则组件就和后端的存储结构焊死了
    expect('views' in a).toBe(false)
    expect('publishedAt' in a).toBe(false)
  })

  it('透传 author.id，用于判断是否为本人文章', () => {
    const a = toArticle(makeDto())
    expect(a.author.id).toBe('u_123')
    expect(a.author.name).toBe('编辑部')
  })

  it('author 为 null 时降级为佚名且 id 为 undefined', () => {
    const a = toArticle(makeDto({ author: null }))
    expect(a.author.name).toBe('佚名')
    expect(a.author.id).toBeUndefined()
  })

  it('无封面时版式为 text', () => {
    const a = toArticle(makeDto({ cover: undefined }))
    expect(a.type).toBe('text')
  })

  it('每第 5 篇（index 4）为横版', () => {
    const a = toArticle(makeDto(), 4)
    expect(a.type).toBe('wide')
  })
})

describe('toArticleList', () => {
  it('批量映射并保持顺序，版式随位置变化', () => {
    const list = toArticleList([makeDto({ id: 'x' }), makeDto({ id: 'y' })])
    expect(list.map((a) => a.id)).toEqual(['x', 'y'])
    expect(list[0].type).toBe('wide') // index 0
    expect(list[1].type).toBe('standard') // index 1
  })
})

describe('toColumn', () => {
  it('articleCount → count，并生成展示用 index', () => {
    const c = toColumn(
      { id: 'c1', name: '前端', slug: 'fe', description: 'd', order: 1, articleCount: 12 },
      0,
    )
    expect(c.count).toBe(12)
    expect(c.index).toBe('01')
    expect(c.description).toBe('d')
  })
})

describe('toAuthUser', () => {
  it('username → name，role 映射为中文且决定 isAuthor', () => {
    const u = toAuthUser({ id: 'u1', username: '张三', email: 'a@b.com', role: 'author' })
    expect(u.name).toBe('张三')
    expect(u.isAuthor).toBe(true)
    expect(u.roleLabel).toBe('作者')
  })

  it('非 author 角色兜底为 reader（老数据/未知角色不崩）', () => {
    const u = toAuthUser({ id: 'u1', username: 'x', email: 'a@b.com', role: 'admin' })
    expect(u.isAuthor).toBe(false)
    expect(u.roleLabel).toBe('读者')
  })
})
