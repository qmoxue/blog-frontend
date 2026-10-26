<script setup lang="ts">
import { ref } from 'vue'
import MagazineNav from './components/MagazineNav.vue'
import Masthead from './components/Masthead.vue'
import FeaturedPost from './components/FeaturedPost.vue'
import ColumnStrip from './components/ColumnStrip.vue'
import ArticleStream from './components/ArticleStream.vue'
import { columns, featuredArticle, initialArticles, moreArticles } from './data/articles'
import type { Article } from './types'

const articles = ref<Article[]>([...initialArticles])
const hasMore = ref(true)
const loading = ref(false)

function loadMore() {
  if (!hasMore.value || loading.value) return

  loading.value = true
  window.setTimeout(() => {
    articles.value = [...articles.value, ...moreArticles]
    hasMore.value = false
    loading.value = false
  }, 480)
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

      <FeaturedPost :article="featuredArticle" />

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
