<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Masthead from '../components/Masthead.vue'
import FeaturedPost from '../components/FeaturedPost.vue'
import ColumnStrip from '../components/ColumnStrip.vue'
import ArticleStream from '../components/ArticleStream.vue'
import {
  columns as mockColumns,
  featuredArticle as mockFeatured,
  initialArticles,
  moreArticles,
} from '../data/articles'
import { getArticles, getColumns } from '../api/articles'
import type { Article, Column } from '../types'

/**
 * 首页数据来源
 * ------------------------------------------------------------
 * 先渲染本地演示数据，挂载后立刻请求接口，拿到就替换。
 *
 * 为什么不「等接口回来再渲染」？
 *   那样后端没启动时页面会一直空白 —— 一个请求失败就把整个版面拖没了。
 *   现在最坏的情况是「显示演示数据」，页面永远是完整的。
 */

/** 每页条数：第一篇做头条，其余进文章流 */
const PAGE_SIZE = 7

/**
 * 模块级缓存：首页数据在路由跳转之间保留。
 * 不这么做的话，从文章页「返回」会重新挂载首页并重新拉取，
 * 重新拉取是异步的，滚动位置恢复时列表还没渲染出来，
 * 浏览器只能停在顶部 —— 这就是「返回丢滚动位置」的根因。
 * 缓存后，返回时列表是同步恢复的全量数据，滚动位置能正确还原。
 * 代价是数据可能稍有延迟（新发布的文章要重新进首页才会刷新），
 * 对杂志类站点可接受，且换设备/刷新依然是实时数据。
 */
interface HomeCache {
  featured: Article
  articles: Article[]
  columns: Column[]
  hasMore: boolean
  page: number
  source: 'mock' | 'api'
}
let homeCache: HomeCache | null = null

// 用一个显式类型读取缓存，绕过 TS 对模块级 let 的控制流收窄（否则会被收窄成 null）
const cached = homeCache as HomeCache | null
const featured = ref<Article>(cached?.featured ?? mockFeatured)
const articles = ref<Article[]>(cached ? [...cached.articles] : [...initialArticles])
const columns = ref<Column[]>(cached ? [...cached.columns] : [...mockColumns])
const hasMore = ref(cached?.hasMore ?? true)
const loading = ref(false)
const page = ref(cached?.page ?? 1)

/** 当前数据来源，只用于排查问题时打日志，不参与渲染 */
const source = ref<'mock' | 'api'>(cached?.source ?? 'mock')

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/** 把当前首页数据写进模块级缓存（只缓存真实接口数据，演示数据不缓存） */
function persistCache() {
  if (source.value !== 'api') return
  homeCache = {
    featured: featured.value,
    articles: [...articles.value],
    columns: [...columns.value],
    hasMore: hasMore.value,
    page: page.value,
    source: source.value,
  }
}

/**
 * 首屏：拉第一页文章 + 专栏
 * 任何一步失败都保持本地演示数据，绝不白屏
 */
async function loadFirstPage() {
  loading.value = true

  try {
    const [articlePage, columnList] = await Promise.all([
      getArticles({ page: 1, pageSize: PAGE_SIZE }),
      getColumns(),
    ])

    if (articlePage.list.length > 0) {
      // 第一篇做头条，剩下的进文章流
      featured.value = articlePage.list[0]
      articles.value = articlePage.list.slice(1)
      hasMore.value = articlePage.hasMore
      page.value = 1
      source.value = 'api'
    } else {
      console.warn('[TechMag] 接口返回 0 篇文章，继续使用本地演示数据。是否忘了执行 npm run seed？')
    }

    if (columnList.length > 0) {
      columns.value = columnList
    }

    console.info(
      `[TechMag] 数据来源：${source.value === 'api' ? '后端接口' : '本地演示数据'}，共 ${articlePage.total} 篇`,
    )
    // 拿到真实数据后写缓存，返回首页就能同步还原、滚动位置不丢
    persistCache()
  } catch (err) {
    source.value = 'mock'
    homeCache = null // 接口不可用：清掉缓存，下次挂载重新尝试拉取
    console.warn('[TechMag] 接口不可用，已回退到本地演示数据。后端是否已启动？', err)
  } finally {
    loading.value = false
  }
}

/**
 * 只在「还没有缓存」时拉取（首次进入或上次接口失败）。
 * 有缓存时直接使用模块级数据，避免返回首页时重新请求造成的闪烁与滚动丢失。
 */
onMounted(() => {
  if (!homeCache) loadFirstPage()
})

/**
 * 加载更多
 * api 模式 → 请求下一页并追加
 * mock 模式 → 追加本地数据（保持原来的演示行为）
 */
async function loadMore() {
  if (!hasMore.value || loading.value) return

  loading.value = true

  try {
    if (source.value === 'api') {
      const next = page.value + 1
      const res = await getArticles({ page: next, pageSize: PAGE_SIZE })

      page.value = next
      articles.value = [...articles.value, ...res.list]
      hasMore.value = res.hasMore
      persistCache() // 追加后同步更新缓存，返回时仍是完整列表
    } else {
      await delay(480)
      articles.value = [...articles.value, ...moreArticles]
      hasMore.value = false
    }
  } catch (err) {
    console.warn('[TechMag] 加载更多失败：', err)
    hasMore.value = false
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative z-10 mx-auto max-w-[1280px] px-5 pt-28 sm:px-8 lg:px-12">
    <Masthead />

    <FeaturedPost :article="featured" />

    <ColumnStrip :columns="columns" />

    <ArticleStream
      :articles="articles"
      :has-more="hasMore"
      :loading="loading"
      @load-more="loadMore"
    />
  </div>
</template>
