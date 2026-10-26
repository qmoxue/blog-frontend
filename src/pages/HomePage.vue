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

const featured = ref<Article>(mockFeatured)
const articles = ref<Article[]>([...initialArticles])
const columns = ref<Column[]>([...mockColumns])
const hasMore = ref(true)
const loading = ref(false)
const page = ref(1)

/** 当前数据来源，只用于排查问题时打日志，不参与渲染 */
const source = ref<'mock' | 'api'>('mock')

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

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
  } catch (err) {
    source.value = 'mock'
    console.warn('[TechMag] 接口不可用，已回退到本地演示数据。后端是否已启动？', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadFirstPage)

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
