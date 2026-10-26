import type { Article, Column, Quote } from '../types'

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`

const avatar = (id: string) =>
  `https://images.unsplash.com/${id}?q=80&w=160&h=160&auto=format&fit=crop&crop=faces`

export const featuredArticle: Article = {
  id: 0,
  title: '如何打造有辨识度的前端求职项目',
  category: '前端工程化',
  author: {
    name: '沈知许',
    role: '前端架构师',
    avatar: avatar('photo-1438761681033-6461ffad8d80'),
  },
  date: '2025-09-02',
  cover: img('photo-1499750310107-5fef28a66643', 1600),
  readTime: '8 分钟阅读',
  type: 'wide',
  excerpt:
    '面试官在简历上停留的时间大约只有三十秒，能让他们停下来追问的，往往不是技术栈清单，而是项目里那些说不清对错、只能靠判断做出的取舍。这篇文章从选题、结构、叙事三个层面，拆解一个「能讲二十分钟」的前端项目该长成什么样。',
}

export const initialArticles: Article[] = [
  {
    id: 1,
    title: 'Vue3 组合式 API 最佳实践',
    category: 'Vue',
    author: {
      name: '苏明远',
      role: '前端工程师',
      avatar: avatar('photo-1500648767791-00dcc994a43e'),
    },
    date: '2025-08-29',
    cover: img('photo-1461749280684-dccba630e2f6'),
    excerpt: '从逻辑复用、依赖注入到组合函数的边界，一份来自真实项目的经验清单。',
    type: 'standard',
    readTime: '6 分钟阅读',
  },
  {
    id: 2,
    title: 'CSS 容器查询完全指南',
    category: 'CSS',
    author: {
      name: '周亦辰',
      role: '界面工程师',
      avatar: avatar('photo-1494790108377-be9c29b29330'),
    },
    date: '2025-08-25',
    type: 'text',
    readTime: '5 分钟阅读',
  },
  {
    id: 3,
    title: '前端工程化体系搭建思路',
    category: '工程化',
    author: {
      name: '陈景川',
      role: '基建负责人',
      avatar: avatar('photo-1507003211169-0a1dd7228f2d'),
    },
    date: '2025-08-18',
    cover: img('photo-1517694712202-14dd9538aa97'),
    type: 'standard',
    readTime: '11 分钟阅读',
  },
  {
    id: 4,
    title: 'TypeScript 在大型项目中的类型设计',
    category: 'TypeScript',
    author: {
      name: '沈知许',
      role: '前端架构师',
      avatar: avatar('photo-1438761681033-6461ffad8d80'),
    },
    date: '2025-08-10',
    cover: img('photo-1555066931-4365d14bab8c'),
    excerpt:
      '类型不是注释的替代品。当业务规模超过十万行，类型系统承担的是「让错误无法通过编译」的职责，而不是让 IDE 有提示可看。',
    type: 'wide',
    readTime: '14 分钟阅读',
  },
  {
    id: 5,
    title: '性能优化：从指标到落地',
    category: '性能优化',
    author: {
      name: '吴墨白',
      role: '性能工程师',
      avatar: avatar('photo-1472099645785-5658abf4ff4e'),
    },
    date: '2025-07-24',
    cover: img('photo-1551288049-bebda4e38f71'),
    excerpt: 'LCP 掉到 4 秒之后，我们做了什么，以及哪些事情其实白做了。',
    type: 'standard',
    readTime: '9 分钟阅读',
  },
  {
    id: 6,
    title: '组件库设计的底层逻辑',
    category: '组件库',
    author: {
      name: '江时雨',
      role: '设计工程师',
      avatar: avatar('photo-1517841905240-472988babdf9'),
    },
    date: '2025-07-02',
    cover: img('photo-1517180102446-f3ece451e9d8'),
    type: 'standard',
    readTime: '7 分钟阅读',
  },
]

export const moreArticles: Article[] = [
  {
    id: 7,
    title: '用 View Transitions 重做页面切换',
    category: '浏览器',
    author: {
      name: '顾南乔',
      role: '前端工程师',
      avatar: avatar('photo-1534528741775-53994a69daeb'),
    },
    date: '2025-06-26',
    type: 'text',
    readTime: '4 分钟阅读',
  },
  {
    id: 8,
    title: '从零实现一个可访问性友好的弹层',
    category: '可访问性',
    author: {
      name: '林见鹿',
      role: '交互开发',
      avatar: avatar('photo-1544005313-94ddf0286df2'),
    },
    date: '2025-06-19',
    cover: img('photo-1531403009284-440f080d1e12'),
    excerpt: '焦点管理、滚动锁定与屏幕阅读器播报，三件最容易被跳过的事。',
    type: 'standard',
    readTime: '10 分钟阅读',
  },
  {
    id: 9,
    title: '构建时预渲染：SSG 的取舍',
    category: '架构',
    author: {
      name: '白砚清',
      role: '技术负责人',
      avatar: avatar('photo-1506794778202-cad84cf45f1d'),
    },
    date: '2025-06-11',
    cover: img('photo-1484417894907-623942c8ee29'),
    excerpt: '在内容站点上，SSG 常常比 SSR 更划算——前提是你接受它的构建代价。',
    type: 'wide',
    readTime: '12 分钟阅读',
  },
]

export const quotes: Quote[] = [
  {
    id: 1,
    text: '好的排版不是装饰，而是让文字找到它应有的呼吸。',
    source: '编辑部手记',
  },
  {
    id: 2,
    text: '抽象的边界，决定了系统能走多远。',
    source: '沈知许 · 类型设计',
  },
  {
    id: 3,
    text: '性能不是一次优化，而是一种持续的习惯。',
    source: '吴墨白 · 性能优化',
  },
]

export const columns: Column[] = [
  {
    id: 'under-the-hood',
    index: '01',
    name: '界面之下',
    description: '浏览器、渲染与排版原理',
    count: 24,
  },
  {
    id: 'engineering-notes',
    index: '02',
    name: '工程手记',
    description: '构建、协作与交付效率',
    count: 18,
  },
  {
    id: 'career',
    index: '03',
    name: '职业札记',
    description: '成长路径与选择的方法',
    count: 11,
  },
]
