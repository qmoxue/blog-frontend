export type CardType = 'standard' | 'wide' | 'text'

export interface Author {
  name: string
  role: string
  avatar: string
}

export interface Article {
  /**
   * 文章 id。
   * 用 string 而不是 number，因为后端用 MongoDB 的 ObjectId
   * （形如 "6ade09a4500f78d19b72a7ce"），不是自增数字。
   * 本地演示数据用 'm1'、'm2' 这种字符串，保持同一类型。
   */
  id: string
  title: string
  category: string
  author: Author
  date: string
  cover?: string
  excerpt?: string
  type: CardType
  readTime?: string
}

export interface NavItem {
  label: string
  href: string
  active?: boolean
}

export interface Quote {
  id: number
  text: string
  source: string
}

export interface Column {
  id: string
  index: string
  name: string
  description: string
  count: number
}

/** 瀑布流中的条目：文章或穿插引用 */
export type StreamItem =
  | { kind: 'post'; key: string; article: Article }
  | { kind: 'quote'; key: string; quote: Quote }

/**
 * 用户角色
 * 后端只认这两个值（数据库 enum 也是），前端不要自己造第三种
 */
export type UserRole = 'reader' | 'author'

/**
 * 登录用户
 * ------------------------------------------------------------
 * 注意这里叫 name 而不是 username，和 Author.name 保持一致：
 * 组件里显示"谁写的"和"谁登录了"，用的是同一套词汇。
 * 后端字段名 username 只出现在 adapters.ts 里，不外泄。
 */
export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  /** 给界面直接显示的中文角色名 */
  roleLabel: string
  /** 能不能发文章。权限最终以后端为准，这里只用来控制界面显不显示入口 */
  isAuthor: boolean
}
