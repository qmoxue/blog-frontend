export type CardType = 'standard' | 'wide' | 'text'

export interface Author {
  name: string
  role: string
  avatar: string
}

export interface Article {
  id: number
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
