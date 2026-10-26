<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MagazineNav from './components/MagazineNav.vue'
import Masthead from './components/Masthead.vue'
import FeaturedPost from './components/FeaturedPost.vue'
import ColumnStrip from './components/ColumnStrip.vue'
import ArticleStream from './components/ArticleStream.vue'
import {
  columns as mockColumns,
  featuredArticle as mockFeatured,
  initialArticles,
  moreArticles,
} from './data/articles'
import { getArticles, getColumns } from './api/articles'
import type { Article, Column } from './types'

/**
 * 首页数据来源
 * ------------------------------------------------------------
 * 先渲染本地演示数据，挂载后立刻请求接口，拿到就替换。
 *
 * 为什么不「等接口回来再渲染」？
 *   那样后端没启动时页面会一直空白 —— 一个请求失败就把整个版面拖没了。
 *   现在最坏的情况是「显示演示数据」，页面永远是完整的。
 *
 * 为什么请求写在这一层，不写进各个组件？
 *   数据是页面的，不是某张卡片的。放在这里，子组件只负责展示，
 *   它们不知道数据来自接口还是本地 —— 这也正是它们一行都不用改的原因。
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
      // 接口通了但库里没有文章（比如忘了跑 npm run seed）
      console.warn('[TechMag] 接口返回 0 篇文章，继续使用本地演示数据。是否忘了执行 npm run seed？')
    }

    // 专栏为空不影响文章展示，单独判断
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
    // 加载更多失败不应该清空已有内容，只停止继续加载
    console.warn('[TechMag] 加载更多失败：', err)
    hasMore.value = false
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section
    id="blogs"
    class="paper-grain relative min-h-screen w-full select-none bg-[#F8F5F0] text-[#1A1A1A]"
  >
    <MagazineNav />

    <div
      class="relative z-10 mx-auto max-w-[1280px] px-5 pb-24 pt-28 sm:px-8 lg:px-12"
    >
      <Masthead />

      <FeaturedPost :article="featured" />

      <ColumnStrip :columns="columns" />

      <ArticleStream
        :articles="articles"
        :has-more="hasMore"
        :loading="loading"
        @load-more="loadMore"
      />

      <!-- 刊尾 -->
      <footer
        id="about"
        class="mt-20 flex scroll-mt-24 flex-col gap-6 border-t border-[#E5E0D8] pt-8 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="font-display text-[20px] leading-none text-[#1A1A1A]">
            技刊 TechMag
          </p>
          <p class="mt-3 text-[13px] leading-relaxed text-[#999999]">
            一份关于前端工程与设计的独立刊物 · 每月九日更新
          </p>
        </div>

        <div class="flex items-center gap-6 text-[13px] text-[#666666]">
          <a href="#about" class="transition-colors duration-300 hover:text-[#8B5A2B]">关于本刊</a>
          <span class="h-3 w-px bg-[#E5E0D8]" />
          <a href="#about" class="transition-colors duration-300 hover:text-[#8B5A2B]">投稿</a>
          <span class="h-3 w-px bg-[#E5E0D8]" />
          <a href="#about" class="transition-colors duration-300 hover:text-[#8B5A2B]">订阅</a>
        </div>
      </footer>
    </div>
  </section>
</template>
