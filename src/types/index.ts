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
