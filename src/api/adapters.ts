/**
 * 数据形状翻译层（adapter）
 * ------------------------------------------------------------
 * 这里是整个对接最关键的一个文件。
 *
 * 为什么需要它？
 *   后端和前端对「一篇文章」的理解不一样：
 *     后端关心存储：id / column / publishedAt / readTime(数字)
 *     组件关心展示：category / date / readTime("8 分钟阅读") / type(卡片尺寸)
 *   如果让组件直接用后端字段名，等于把「数据库结构」和「界面」焊死在一起：
 *   后端哪天把 column 改名叫 categoryId，十几个组件全要跟着改。
 *
 *   有了这一层，组件永远只认 Article 这个类型。
 *   后端字段变了，只改这一个文件。
 *
 * 这条边界还有个名字：防腐层（anti-corruption layer）。
 * 听着很学术，其实就是"别让外面的数据模型污染里面的代码"。
 */
import type { Article, AuthUser, CardType, Column, UserRole } from '../types'

// ------------------------------------------------------------------
// 后端返回的原始结构（DTO = Data Transfer Object）
// 只声明前端用得到的字段，后端加了新字段这里不用改
// ------------------------------------------------------------------

export interface ArticleAuthorDto {
  id: string
  username: string
}

export interface ArticleColumnDto {
  id: string
  name: string
  slug: string
}

export interface ArticleDto {
  id: string
  title: string
  excerpt?: string
  cover?: string
  tags?: string[]
  /** 分钟数，是数字 */
  readTime: number
  views: number
  year: number
  issue: number
  /** ISO 时间字符串 */
  publishedAt: string
  author: ArticleAuthorDto | null
  column: ArticleColumnDto | null
}

export interface ColumnDto {
  id: string
  name: string
  slug: string
  description?: string
  order: number
  articleCount: number
}

// ------------------------------------------------------------------
// 格式化工具
// ------------------------------------------------------------------

/** ISO 时间 → 2026-09-01 */
function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 决定这张卡片用什么版式
 * ------------------------------------------------------------
 * ⚠️ 后端**没有** type 字段，而且不应该有。
 *   "这张卡要宽、要窄、还是纯文字"是**版面决策**，不是数据属性。
 *   如果让数据库存这个字段，以后改设计就得改数据 —— 那是不可逆的耦合。
 *
 * 规则（编辑逻辑，和杂志排版一样按位置决定节奏）：
 *   没有封面图 → 纯文字卡（有图才能上图）
 *   第 1 篇      → 横版卡（开篇定基调）
 *   每第 5 篇    → 横版卡（打破三栏的单调）
 *   其余        → 标准卡
 */
function deriveCardType(dto: ArticleDto, index: number): CardType {
  if (!dto.cover) return 'text'
  if (index === 0) return 'wide'
  if (index % 5 === 4) return 'wide'
  return 'standard'
}

// ------------------------------------------------------------------
// 对外：翻译函数
// ------------------------------------------------------------------

/**
 * @param dto   后端返回的文章
 * @param index 在列表中的位置（用来决定卡片版式，从 0 开始）
 */
export function toArticle(dto: ArticleDto, index = 0): Article {
  return {
    id: dto.id,
    title: dto.title,
    // 专栏名当分类用；没归属专栏的文章给个兜底文案，
    // 否则卡片上会留一块空白，看起来像渲染错误
    category: dto.column?.name ?? '未分类',
    author: {
      name: dto.author?.username ?? '佚名',
      // 后端没有作者简介和头像字段，给占位值。
      // PostCard 在 avatar 为空时会退化成「名字首字」的圆形头像
      role: '作者',
      avatar: '',
      // 后端 author.id 透传过来，前端据此判断「是不是本人文章」
      // （决定编辑 / 删除入口是否出现）。author 为 null 时给 undefined
      id: dto.author?.id ?? undefined,
    },
    date: formatDate(dto.publishedAt),
    cover: dto.cover || undefined,
    excerpt: dto.excerpt || undefined,
    type: deriveCardType(dto, index),
    // 后端给的是数字 8，组件要的是「8 分钟阅读」这种文案
    readTime: `${dto.readTime} 分钟阅读`,
  }
}

export function toArticleList(list: ArticleDto[]): Article[] {
  return list.map((dto, i) => toArticle(dto, i))
}

/**
 * 专栏
 * 后端的 articleCount → 组件的 count；
 * 组件的 index（显示用的 "01" "02"）后端没有，按顺序生成
 */
export function toColumn(dto: ColumnDto, index = 0): Column {
  return {
    id: dto.id,
    index: String(index + 1).padStart(2, '0'),
    name: dto.name,
    description: dto.description ?? '',
    count: dto.articleCount,
  }
}

export function toColumnList(list: ColumnDto[]): Column[] {
  return list.map((dto, i) => toColumn(dto, i))
}

// ------------------------------------------------------------------
// 用户
// ------------------------------------------------------------------

/**
 * 后端返回的用户
 * ------------------------------------------------------------
 * 后端还有 createdAt / updatedAt，前端目前不显示，所以不声明。
 * 这正是 adapter 的好处：没声明的字段连类型层面都拿不到，
 * 想用的时候必须来这里加一行 —— 数据流向是显式的。
 */
export interface AuthUserDto {
  id: string
  username: string
  email: string
  role: string
}

/** 角色 → 中文名。后端存的是英文枚举，界面要中文 */
const ROLE_LABEL: Record<UserRole, string> = {
  reader: '读者',
  author: '作者',
}

/**
 * @param dto 后端用户
 */
export function toAuthUser(dto: AuthUserDto): AuthUser {
  // 后端理论上只会给 reader / author，但数据库里的老数据、
  // 或者以后新增的角色都可能漏过来。这里兜底成 reader，
  // 而不是让 role 变成 undefined 后在界面上渲染出空白
  const role: UserRole = dto.role === 'author' ? 'author' : 'reader'

  return {
    id: dto.id,
    // username → name：组件不关心后端怎么命名
    name: dto.username,
    email: dto.email,
    role,
    roleLabel: ROLE_LABEL[role],
    isAuthor: role === 'author',
  }
}
