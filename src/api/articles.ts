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
 *
 * @param signal 用于取消。搜索场景里每敲一个字就会发一次请求，
 *               上一次没回来就被新的顶掉，必须能主动放弃，否则
 *               慢的那个后回来会覆盖掉快的结果（竞态）。
 */
export async function getArticles(
  query: ArticleQuery = {},
  signal?: AbortSignal,
): Promise<ArticlePage> {
  const data = await request<Paginated<ArticleDto>>(`/articles${toQueryString(query)}`, {
    signal,
  })

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

// ------------------------------------------------------------------
// 写作（需登录 + author 角色）
// ------------------------------------------------------------------

/**
 * 提交给后端的字段
 * ------------------------------------------------------------
 * ⚠️ 这里**没有** author 和 views。
 *   作者只能由后端从登录态取，阅读数只能由后端 $inc。
 *   前端就算传了也会被 zod 剥掉（这叫批量赋值防护，见后端 article.validator.js）。
 *
 * ⚠️ year 和 issue 是必填的。
 *   后端 schema 里它们是 required —— 这个项目是"杂志"，每篇文章都属于某一年的某一期，
 *   没有这两个字段就没法进归档。编辑器必须收集，不能留空提交。
 */
export interface ArticleInput {
  title: string
  content: string
  excerpt?: string
  /** 只接受上传接口返回的站内路径，不能填外链 */
  cover?: string
  tags?: string[]
  readTime?: number
  year: number
  issue: number
  /** 专栏 id，不属于任何专栏就传 null */
  column?: string | null
}

/**
 * 编辑器里用的「原始字段」视图
 * ------------------------------------------------------------
 * 为什么不复用 Article 类型？
 *   Article 是给**展示**用的：date 是 "2026-10-26"、readTime 是 "8 分钟阅读"、
 *   category 是专栏名。这些都不能回填到输入框里。
 *   编辑器要的是能直接塞进 <input> 的原始值，所以单独一个类型。
 *
 *   两个类型各自服务一个方向（读 / 写），中间靠 adapter 隔开。
 */
export interface ArticleEditModel {
  id: string
  title: string
  content: string
  excerpt: string
  cover: string
  tags: string[]
  readTime: number
  year: number
  issue: number
  columnId: string | null
  /**
   * 作者 id
   * ------------------------------------------------------------
   * 后端只有 PATCH 时才校验"这是不是你写的"，所以前端要自己先比一次，
   * 否则作者 A 打开作者 B 的文章，写完点保存才收到 403 —— 白写一遍。
   */
  authorId: string | null
}

/** 后端原始结构（含正文），只在编辑器里用 */
interface ArticleRawDto extends ArticleDto {
  content: string
}

/**
 * 取一篇文章的原始字段用于编辑
 * GET /api/v1/articles/:id
 *
 * 注意用的是同一个公开接口 —— 详情接口本来就返回正文，
 * 不需要为编辑器单独开一个。权限判断发生在**保存**的时候（PATCH），
 * 而不是读取的时候：别人也能看你的文章，只是改不了。
 */
export async function getArticleForEdit(id: string): Promise<ArticleEditModel> {
  const data = await request<{ article: ArticleRawDto }>(`/articles/${id}`)
  const dto = data.article

  return {
    id: dto.id,
    title: dto.title,
    content: dto.content,
    excerpt: dto.excerpt ?? '',
    cover: dto.cover ?? '',
    tags: dto.tags ?? [],
    readTime: dto.readTime,
    year: dto.year,
    issue: dto.issue,
    columnId: dto.column?.id ?? null,
    authorId: dto.author?.id ?? null,
  }
}

/**
 * 新建文章
 * POST /api/v1/articles → 201
 */
export async function createArticle(input: ArticleInput): Promise<{ id: string }> {
  const data = await request<{ article: { id: string } }>('/articles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.article
}

/**
 * 修改文章
 * PATCH /api/v1/articles/:id
 *
 * 用 PATCH 而不是 PUT：只传要改的字段。
 * PUT 是"整体替换"，漏传的字段会被清空 —— 表单少一个隐藏字段就是数据丢失。
 */
export async function updateArticle(id: string, input: Partial<ArticleInput>): Promise<{ id: string }> {
  const data = await request<{ article: { id: string } }>(`/articles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.article
}

/**
 * 删除文章
 * DELETE /api/v1/articles/:id
 *
 * 权限在后端卡两道：requireRole('author') + service 里比对 author 字段。
 * 前端这里只做"显不显示删除按钮"的软判断（isAuthor），
 * 真正的拦截以后端为准 —— 别人拼 URL 直接发 DELETE 也会被 403 / 404 挡住。
 *
 * 返回 void：后端删除成功时 data 为 null，没什么可拿的。
 */
export async function deleteArticle(id: string): Promise<void> {
  await request<void>(`/articles/${id}`, { method: 'DELETE' })
}

/**
 * 上传封面
 * POST /api/v1/uploads/cover，multipart/form-data，字段名必须是 file
 *
 * 返回的是**相对路径**（/uploads/covers/xxx.png），不是完整 URL。
 * 好处：换域名、上 CDN、切 https 都不用改数据库里的历史数据。
 */
export async function uploadCover(file: File): Promise<{ url: string; size: number }> {
  const form = new FormData()
  // 字段名 'file' 是后端 multer.single('file') 写死的，改成别的直接 400
  form.append('file', file)

  // 不要手动设 Content-Type —— 浏览器要自己写 boundary（见 client.ts）
  return request<{ url: string; size: number }>('/uploads/cover', {
    method: 'POST',
    body: form,
  })
}
