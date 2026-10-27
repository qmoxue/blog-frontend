<script setup lang="ts">
/**
 * 搜索页
 * ------------------------------------------------------------
 * 为什么是独立页面，而不是导航栏上的一个弹层？
 *
 *   弹层看着更"高级"，但搜索词只能存在组件状态里。
 *   结果就是：刷新一下搜索就没了、链接分享出去对方看到的是首页、
 *   后退键退出的是弹层而不是"上一次搜索"。
 *
 *   独立页面把搜索词交给 URL（/search?q=xxx），上面三件事全部自动成立，
 *   不用写一行额外的代码。**URL 是唯一一个"免费"的状态存储。**
 *
 * 逻辑都在 composables/useSearch.ts，这里只管长什么样。
 */
import { computed } from 'vue'
import { ArrowLeft, Search, X } from 'lucide-vue-next'
import PostCard from '../components/PostCard.vue'
import { useSearch } from '../composables/useSearch'

const {
  keyword,
  status,
  results,
  total,
  errorMessage,
  onCompositionStart,
  onCompositionEnd,
  searchNow,
  retry,
  clear,
} = useSearch()

/** 结果里第一张卡占两栏，让版面有主次，不是均匀的三列 */
const spanOf = (index: number): string => (index === 0 ? 'md:col-span-2' : '')

const hasKeyword = computed(() => keyword.value.trim().length > 0)
</script>

<template>
  <div class="relative z-10 mx-auto max-w-[1080px] px-5 pt-28 sm:px-8 lg:px-12">
    <RouterLink
      to="/"
      class="group inline-flex items-center gap-2 text-[13px] text-[#666666] transition-colors duration-300 hover:text-[#8B5A2B]"
    >
      <ArrowLeft
        :size="15"
        :stroke-width="1.6"
        class="transition-transform duration-300 group-hover:-translate-x-0.5"
      />
      返回首页
    </RouterLink>

    <!-- 标题 -->
    <header class="mt-10 border-b border-[#E5E0D8] pb-8">
      <p class="text-[10px] uppercase tracking-[0.26em] text-[#8B5A2B]">Search</p>
      <h1 class="mt-4 font-display text-[34px] leading-none text-[#1A1A1A] sm:text-[44px]">
        检索
      </h1>

      <!--
        用 form 而不是裸 input：
        手机键盘的回车键会变成"搜索"，点它触发 submit。
        裸 input 只能靠 @keyup.enter 碰运气，部分输入法下不触发。
      -->
      <form
        role="search"
        class="relative mt-8"
        @submit.prevent="searchNow"
      >
        <label for="search-input" class="sr-only">搜索文章</label>

        <Search
          :size="20"
          :stroke-width="1.5"
          class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[#999999]"
        />

        <input
          id="search-input"
          v-model="keyword"
          type="search"
          autocomplete="off"
          placeholder="搜索标题与正文…"
          class="w-full border-0 border-b border-[#E5E0D8] bg-transparent pb-4 pl-9 pr-10 font-display text-[22px] leading-tight text-[#1A1A1A] outline-none transition-colors duration-300 placeholder:font-sans placeholder:text-[15px] placeholder:text-[#B3ADA3] focus:border-[#8B5A2B] sm:text-[26px]"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
        />

        <button
          v-if="hasKeyword"
          type="button"
          aria-label="清空搜索"
          class="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#999999] transition-colors duration-300 hover:bg-black/5 hover:text-[#1A1A1A]"
          @click="clear"
        >
          <X :size="16" :stroke-width="1.6" />
        </button>
      </form>
    </header>

    <!--
      状态区
      ------------------------------------------------------------
      四种状态互斥，用 v-if / v-else-if 串起来。
      注意 idle 和 done 要分开：一个是"还没搜"，一个是"搜了没结果"。
      合并成一句"暂无内容"会让人以为搜索坏了。
    -->
    <section class="mt-12" aria-live="polite">
      <!-- 还没输入 -->
      <div v-if="status === 'idle'" class="py-16 text-center">
        <p class="text-[14px] leading-[1.9] text-[#999999]">
          输入关键词，检索标题与正文。
        </p>
      </div>

      <!-- 搜索中：骨架屏，别用转圈 -->
      <div v-else-if="status === 'searching'" class="animate-pulse">
        <div class="h-3 w-28 rounded bg-[#EDE7DC]" />
        <div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div v-for="n in 3" :key="n" class="rounded-lg bg-[#EDE7DC]" :class="n === 1 ? 'h-64 md:col-span-2' : 'h-64'" />
        </div>
      </div>

      <!-- 失败 -->
      <div v-else-if="status === 'error'" class="py-16 text-center">
        <p class="font-display text-[24px] text-[#1A1A1A]">搜索没能完成</p>
        <p class="mt-4 text-[14px] leading-relaxed text-[#666666]">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-8 inline-flex items-center gap-2 rounded-full border border-[#E5E0D8] px-5 py-2.5 text-[13.5px] text-[#1A1A1A] transition-colors duration-300 hover:border-[#8B5A2B] hover:text-[#8B5A2B]"
          @click="retry"
        >
          重试
        </button>
      </div>

      <!-- 搜到了 -->
      <div v-else-if="status === 'done' && results.length > 0">
        <div class="mb-8 flex items-baseline justify-between">
          <h2 class="font-display text-[20px] leading-none text-[#1A1A1A]">
            “{{ keyword.trim() }}”
          </h2>
          <span class="text-[11px] tracking-[0.18em] text-[#999999]">
            共 {{ total }} 篇
          </span>
        </div>

        <div class="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          <PostCard
            v-for="(article, index) in results"
            :key="article.id"
            v-reveal="{ delay: index * 60 }"
            :article="article"
            :class="spanOf(index)"
          />
        </div>
      </div>

      <!-- 搜了但没有 -->
      <div v-else-if="status === 'done'" class="py-16 text-center">
        <p class="font-display text-[24px] text-[#1A1A1A]">没有找到相关内容</p>
        <p class="mt-4 text-[14px] leading-[1.9] text-[#666666]">
          换个说法试试，或者缩短关键词。<br />
          目前只检索标题与正文，标签和专栏名还不在范围内。
        </p>
      </div>
    </section>
  </div>
</template>
