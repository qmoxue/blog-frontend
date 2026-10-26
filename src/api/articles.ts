/**
 * 文章相关接口
 * ------------------------------------------------------------
 * 这一层是「业务语义」，不是「HTTP 细节」：
 *   调用方说「给我第一页」，不用关心分页参数叫什么、返回结构长什么样。
 *
 * 注意返回的已经是 Article（组件用的类型），不是后端的 DTO。
 * 翻译在 adapters.ts 里做完，页面拿到的数据可以直接塞进组件。
 */
import { request, type Paginated } from './client'
import {
  toArticleList,
  toColumnList,
  type ArticleDto,
  type ColumnDto,
} from './adapters'
import type { Article, Column } from '../types'

export interface ArticleQuery {
  page?: number
  pageSize?: number
  year?: number
  issue?: number
  column?: string
  tag?: string
  /** 搜索词，对标题和正文做子串匹配 */
  q?: string
}

export interface ArticlePage {
  list: Article[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

/** 把查询对象拼成 query string，空值自动跳过 */
function toQueryString(query: ArticleQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

/**
 * 文章列表（不含正文，只有摘要）
 * GET /api/v1/articles
 */
export async function getArticles(query: ArticleQuery = {}): Promise<ArticlePage> {
  const data = await request<Paginated<ArticleDto>>(`/articles${toQueryString(query)}`)

  return {
    list: toArticleList(data.list),
    page: data.pagination.page,
    pageSize: data.pagination.pageSize,
    total: data.pagination.total,
    hasMore: data.pagination.hasMore,
  }
}

/**
 * 文章详情（含正文 Markdown 原文）
 * GET /api/v1/articles/:id
 *
 * ⚠️ 渲染正文时必须先清洗：
 *   DOMPurify.sanitize(markdownIt.render(content))
 *   直接 v-html 输出未清洗的 HTML = 存储型 XSS（见 docs/security.md R3）
 */
export async function getArticleDetail(id: string): Promise<Article & { content: string }> {
  const data = await request<{ article: ArticleDto & { content: string } }>(`/articles/${id}`)
  const dto = data.article

  return {
    ...toArticleList([dto])[0],
    content: dto.content,
  }
}

/**
 * 专栏列表（带每栏文章数）
 * GET /api/v1/columns
 */
export async function getColumns(): Promise<Column[]> {
  const data = await request<{ list: ColumnDto[] }>('/columns')
  return toColumnList(data.list)
}

/**
 * 归档索引：所有「年 + 期」
 * GET /api/v1/archives
 */
export interface ArchiveItem {
  year: number
  issue: number
  count: number
}

export async function getArchives(): Promise<ArchiveItem[]> {
  const data = await request<{ list: ArchiveItem[] }>('/archives')
  return data.list
}
