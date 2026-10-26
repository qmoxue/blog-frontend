<script setup lang="ts">
import { computed } from 'vue'
import PostCard from './PostCard.vue'
import QuoteBlock from './QuoteBlock.vue'
import SlimeButton from './SlimeButton.vue'
import { quotes } from '../data/articles'
import type { Article, Quote } from '../types'

const props = defineProps<{
  articles: Article[]
  hasMore: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'load-more'): void
}>()

interface Band {
  key: string
  kind: 'row' | 'feature' | 'quote'
  articles?: Article[]
  quote?: Quote
}

/**
 * 把文章编排成「版面行」：
 * - 普通卡片三张成一行，行末插入通栏引用
 * - 横版卡占两栏，与下一张卡同处一行（不产生空栏）
 * 只做分组，不做任何高度计算。
 */
const bands = computed<Band[]>(() => {
  const list: Band[] = []
  let row: Article[] = []
  let quoteIndex = 0

  const flushRow = (allowQuote = false) => {
    if (!row.length) return

    const full = row.length === 3
    list.push({ key: `row-${row[0].id}`, kind: 'row', articles: row })
    row = []

    if ((full || allowQuote) && quoteIndex < quotes.length) {
      const quote = quotes[quoteIndex]
      quoteIndex += 1
      list.push({ key: `quote-${quote.id}`, kind: 'quote', quote })
    }
  }

  for (let i = 0; i < props.articles.length; i += 1) {
    const article = props.articles[i]

    if (article.type === 'wide') {
      flushRow()
      const next = props.articles[i + 1]
      const items = next && next.type !== 'wide' ? [article, next] : [article]
      list.push({ key: `feature-${article.id}`, kind: 'feature', articles: items })
      i += items.length - 1
      continue
    }

    row.push(article)
    if (row.length === 3) flushRow()
  }

  // 末行不足三张时，也用一条引用把这一屏收住
  flushRow(true)
  return list
})

const cardSpan = (article: Article, band: Band): string => {
  if (article.type !== 'wide') return ''
  return (band.articles?.length ?? 1) > 1 ? 'md:col-span-2' : 'md:col-span-2 lg:col-span-3'
}
</script>

<template>
  <section id="archive" class="scroll-mt-24">
    <div class="mb-8 flex items-baseline justify-between">
      <h2 class="font-display text-[22px] leading-none text-[#1A1A1A]">文章</h2>
      <span class="text-[11px] tracking-[0.18em] text-[#999999]">
        共 {{ articles.length }} 篇
      </span>
    </div>

    <TransitionGroup name="post" tag="div" class="flex flex-col gap-6">
      <div v-for="band in bands" :key="band.key">
        <QuoteBlock v-if="band.kind === 'quote' && band.quote" :quote="band.quote" />

        <div v-else class="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PostCard
            v-for="(article, index) in band.articles"
            :key="article.id"
            v-reveal="{ delay: index * 100 }"
            :article="article"
            :class="cardSpan(article, band)"
          />
        </div>
      </div>
    </TransitionGroup>

    <!-- 加载更多：容器本身即软胶黏块 -->
    <div class="mt-16 flex justify-center">
      <SlimeButton
        :label="!hasMore ? '已加载全部内容' : loading ? '载入中…' : '加载更多文章'"
        :disabled="!hasMore || loading"
        @click="emit('load-more')"
      />
    </div>
  </section>
</template>
