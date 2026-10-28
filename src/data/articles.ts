import type { Article, Column, Quote } from '../types'

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`

const avatar = (id: string) =>
  `https://images.unsplash.com/${id}?q=80&w=160&h=160&auto=format&fit=crop&crop=faces`

// 说明：以下演示数据刻意写成"有人味"的杂志稿，而不是"最佳实践 / 完全指南"那种
// 一眼 AI 的标题。标题具体、有观点、带一点个人语气；摘要给一个能让人点开的细节。
export const featuredArticle: Article = {
  id: 'm0',
  title: '排版是门慢手艺：我们把正文行宽卡在了 34 个汉字',
  category: '设计观察',
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
    '印刷业给单行宽是 45–75 个字符，但中文一个字顶两个英文宽，直接套会偏窄。我们把正文容器锁在 680px，实测阅读速度比 760px 快了一截——读者说不出为什么，眼睛知道。',
}

export const initialArticles: Article[] = [
  {
    id: 'm1',
    title: '组合式 API 不是语法糖，是复用单位的迁移',
    category: 'Vue',
    author: {
      name: '苏明远',
      role: '前端工程师',
      avatar: avatar('photo-1500648767791-00dcc994a43e'),
    },
    date: '2025-08-29',
    cover: img('photo-1461749280684-dccba630e2f6'),
    excerpt:
      'mixin 的坑是来源隐式，options 的坑是命名冲突。composable 把"这块逻辑从哪来"写回了调用处——props 进、返回值出，就是契约。',
    type: 'standard',
    readTime: '6 分钟阅读',
  },
  {
    id: 'm2',
    title: '容器查询上线后，我删掉了三套媒体查询',
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
    id: 'm3',
    title: '团队工程化，是从一个 pre-commit 钩子开始的',
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
    id: 'm4',
    title: '类型系统设计：什么时候该用泛型，什么时候该认怂',
    category: 'TypeScript',
    author: {
      name: '沈知许',
      role: '前端架构师',
      avatar: avatar('photo-1438761681033-6461ffad8d80'),
    },
    date: '2025-08-10',
    cover: img('photo-1555066931-4365d14bab8c'),
    excerpt:
      '给一个嵌套六层的响应建模时，我一度想写二十个 interface。后来发现，前端根本不读的字段，在 adapter 里丢掉的，就别在类型里留着。',
    type: 'wide',
    readTime: '14 分钟阅读',
  },
  {
    id: 'm5',
    title: 'LCP 从 4.2 秒到 1.1 秒，我们改了五件事',
    category: '性能优化',
    author: {
      name: '吴墨白',
      role: '性能工程师',
      avatar: avatar('photo-1472099645785-5658abf4ff4e'),
    },
    date: '2025-07-24',
    cover: img('photo-1551288049-bebda4e38f71'),
    excerpt:
      '字体阻塞占了 1.8 秒，首图 1.2 秒，剩下的才是 JS。最贵的优化不是写代码，是把那张 2MB 的 hero 图换成 60KB 的 webp。',
    type: 'standard',
    readTime: '9 分钟阅读',
  },
  {
    id: 'm6',
    title: '组件库的第一次分裂：什么时候该抽象',
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
    id: 'm7',
    title: 'View Transitions API 实战：页面切换不再闪白',
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
    id: 'm8',
    title: '一个弹层教会我的三件事：焦点、滚动锁、播报',
    category: '可访问性',
    author: {
      name: '林见鹿',
      role: '交互开发',
      avatar: avatar('photo-1544005313-94ddf0286df2'),
    },
    date: '2025-06-19',
    cover: img('photo-1531403009284-440f080d1e12'),
    excerpt:
      'Tab 键能走出弹层的，等于没关。焦点陷阱、背景滚动锁定、给读屏器的 aria-modal——这三件不做，弹层对键盘用户就是 Bug。',
    type: 'standard',
    readTime: '10 分钟阅读',
  },
  {
    id: 'm9',
    title: '我们放弃了 SSR，选了 SSG——以及为什么',
    category: '架构',
    author: {
      name: '白砚清',
      role: '技术负责人',
      avatar: avatar('photo-1506794778202-cad84cf45f1d'),
    },
    date: '2025-06-11',
    cover: img('photo-1484417894907-623942c8ee29'),
    excerpt:
      '内容站点的页面在构建时就定死了。SSR 每次请求都重渲染，对一篇一周才改一次的文章是浪费。SSG 把渲染挪到构建期，CDN 直接吐静态页。',
    type: 'wide',
    readTime: '12 分钟阅读',
  },
]

export const quotes: Quote[] = [
  {
    id: 1,
    text: '好的排版不是装饰，是让文字找到呼吸的节奏。',
    source: '编辑部手记',
  },
  {
    id: 2,
    text: '抽象的边界，决定了系统能走多远。',
    source: '沈知许 · 类型设计',
  },
  {
    id: 3,
    text: '性能不是一次优化，是上线后还盯着监控的习惯。',
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
