<script setup lang="ts">
import { ref } from 'vue'
import PageCurl from './PageCurl.vue'
import type { Article } from '../types'

const props = defineProps<{
  article: Article
}>()

/** 不同裁切比例让同一行的卡片高度自然错落，而不是统一比例 */
const ratioClass = (id: number): string => {
  const ratios = ['aspect-[4/3]', 'aspect-[3/2]', 'aspect-[16/10]', 'aspect-[5/4]']
  return ratios[id % ratios.length]
}

const isWide = (): boolean => props.article.type === 'wide'

// 外链图片失败时降级为纸色占位，避免出现破图
const coverFailed = ref(false)
const avatarFailed = ref(false)
</script>

<template>
  <article
    class="group relative overflow-hidden rounded-lg transition-shadow duration-[400ms] ease-out"
    :class="
      article.type === 'text'
        ? 'bg-[#F2EDE4] hover:shadow-[0_2px_24px_rgba(139,90,43,0.07)]'
        : 'bg-white hover:shadow-[0_12px_30px_-14px_rgba(26,26,26,0.24)]'
    "
  >
    <!-- 横版卡：左文右图，桌面端占两栏 -->
    <a v-if="isWide()" href="#article" class="flex h-full flex-col-reverse md:flex-row">
      <div class="flex flex-1 flex-col justify-center p-6 sm:p-8">
        <div class="mb-4 flex items-center gap-2.5">
          <span class="text-[10px] uppercase tracking-[0.22em] text-[#8B5A2B]">
            {{ article.category }}
          </span>
          <span class="h-px w-5 bg-[#E5E0D8]" />
          <span class="text-[11px] text-[#999999]">{{ article.date }}</span>
        </div>

        <h3
          class="mb-4 text-balance font-display text-[24px] leading-snug text-[#1A1A1A] transition-colors duration-300 group-hover:text-[#8B5A2B] sm:text-[26px]"
        >
          {{ article.title }}
        </h3>

        <p v-if="article.excerpt" class="mb-6 max-w-lg text-[14px] leading-[1.85] text-[#666666]">
          {{ article.excerpt }}
        </p>

        <div class="mt-auto flex items-center gap-2.5">
          <img
            v-if="!avatarFailed"
            :src="article.author.avatar"
            :alt="article.author.name"
            referrerpolicy="no-referrer"
            loading="lazy"
            class="h-7 w-7 rounded-full bg-[#EFE9DF] object-cover"
            @error="avatarFailed = true"
          />
          <span
            v-else
            class="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFE9DF] text-[11px] text-[#8B5A2B]"
          >
            {{ article.author.name.slice(0, 1) }}
          </span>
          <span class="text-[12.5px] text-[#666666]">{{ article.author.name }}</span>
          <span class="text-[11px] text-[#999999]">· {{ article.readTime }}</span>
        </div>
      </div>

      <div class="relative overflow-hidden bg-[#EFE9DF] md:w-[44%]">
        <img
          v-if="!coverFailed"
          :src="article.cover"
          :alt="article.title"
          referrerpolicy="no-referrer"
          loading="lazy"
          decoding="async"
          class="h-56 w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.04] md:h-full md:min-h-[340px]"
          @error="coverFailed = true"
        />
        <div v-else class="flex h-full min-h-[240px] w-full items-center justify-center">
          <span class="font-display text-[12px] tracking-[0.3em] text-[#8B5A2B]/35">TECHMAG</span>
        </div>

        <PageCurl v-if="!coverFailed" :size="52" />
      </div>
    </a>

    <!-- 标准卡：上图下文 -->
    <a v-else-if="article.type === 'standard'" href="#article" class="flex h-full flex-col">
      <div class="relative overflow-hidden bg-[#EFE9DF]">
        <img
          v-if="!coverFailed"
          :src="article.cover"
          :alt="article.title"
          referrerpolicy="no-referrer"
          loading="lazy"
          decoding="async"
          class="w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
          :class="ratioClass(article.id)"
          @error="coverFailed = true"
        />
        <div
          v-else
          class="flex w-full items-center justify-center"
          :class="ratioClass(article.id)"
        >
          <span class="font-display text-[11px] tracking-[0.3em] text-[#8B5A2B]/35">TECHMAG</span>
        </div>

        <PageCurl v-if="!coverFailed" :size="46" />
      </div>

      <div class="flex flex-1 flex-col p-5">
        <div class="mb-3 flex items-center gap-2.5">
          <span class="text-[10px] uppercase tracking-[0.22em] text-[#8B5A2B]">
            {{ article.category }}
          </span>
          <span class="h-px w-5 bg-[#E5E0D8]" />
          <span class="text-[11px] text-[#999999]">{{ article.date }}</span>
        </div>

        <h3
          class="mb-3 line-clamp-2 font-display text-[20px] leading-snug text-[#1A1A1A] transition-colors duration-300 group-hover:text-[#8B5A2B]"
        >
          {{ article.title }}
        </h3>

        <p
          v-if="article.excerpt"
          class="mb-4 line-clamp-2 text-[13px] leading-relaxed text-[#666666]"
        >
          {{ article.excerpt }}
        </p>

        <div class="mt-auto flex items-center gap-2.5 border-t border-[#E5E0D8]/70 pt-4">
          <img
            v-if="!avatarFailed"
            :src="article.author.avatar"
            :alt="article.author.name"
            referrerpolicy="no-referrer"
            loading="lazy"
            class="h-6 w-6 rounded-full bg-[#EFE9DF] object-cover"
            @error="avatarFailed = true"
          />
          <span
            v-else
            class="flex h-6 w-6 items-center justify-center rounded-full bg-[#EFE9DF] text-[10px] text-[#8B5A2B]"
          >
            {{ article.author.name.slice(0, 1) }}
          </span>
          <span class="text-[12.5px] text-[#666666]">{{ article.author.name }}</span>
          <span class="ml-auto text-[11px] text-[#999999]">{{ article.readTime }}</span>
        </div>
      </div>
    </a>

    <!-- 文字卡：无图短内容 -->
    <a v-else href="#article" class="flex h-full min-h-[210px] flex-col p-7 sm:min-h-[280px]">
      <span class="text-[10px] uppercase tracking-[0.22em] text-[#8B5A2B]">
        {{ article.category }}
      </span>

      <h3
        class="my-auto py-8 font-display text-[21px] leading-[1.5] text-[#1A1A1A] transition-colors duration-300 group-hover:text-[#8B5A2B]"
      >
        {{ article.title }}
      </h3>

      <div class="flex items-center justify-between border-t border-[#1A1A1A]/10 pt-4">
        <span class="text-[12.5px] text-[#666666]">{{ article.author.name }}</span>
        <span class="text-[11px] text-[#999999]">{{ article.date }}</span>
      </div>
    </a>
  </article>
</template>
