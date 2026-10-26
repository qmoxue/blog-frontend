<script setup lang="ts">
import { ref } from 'vue'
import { ArrowUpRight } from 'lucide-vue-next'
import type { Article } from '../types'

defineProps<{
  article: Article
}>()

const coverFailed = ref(false)
// 后端没有作者头像字段，adapter 会传空字符串。
// 空字符串的 <img> 不会触发 error 事件，只会渲染成一个破图图标，
// 所以必须显式判断，缺头像时退化成「名字首字」的圆形色块
const avatarFailed = ref(false)
</script>

<template>
  <section class="mb-20" aria-labelledby="featured-title">
    <div class="grid grid-cols-12 gap-8">
      <!-- 左：图片（视觉重心） -->
      <div
        v-reveal
        class="col-span-12 md:col-span-7"
      >
        <RouterLink
          :to="`/article/${article.id}`"
          class="group relative block h-[300px] overflow-hidden rounded-lg bg-[#EFE9DF] sm:h-[380px] lg:h-full lg:min-h-[420px]"
        >
          <img
            v-if="article.cover && !coverFailed"
            :src="article.cover"
            :alt="article.title"
            referrerpolicy="no-referrer"
            loading="eager"
            decoding="async"
            class="h-full w-full object-cover transition-[transform,filter] duration-[1000ms] ease-soft group-hover:scale-[1.03] group-hover:brightness-105"
            @error="coverFailed = true"
          />
          <div v-else class="flex h-full w-full items-center justify-center">
            <span class="font-display text-[13px] tracking-[0.4em] text-[#8B5A2B]/30">TECHMAG</span>
          </div>
          <span
            class="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#8B5A2B] backdrop-blur-sm"
          >
            {{ article.category }}
          </span>
        </RouterLink>
      </div>

      <!-- 右：文字 -->
      <div
        v-reveal="{ delay: 120 }"
        class="col-span-12 flex flex-col justify-center md:col-span-5"
      >
        <div class="mb-5 flex items-center gap-3">
          <span class="text-[10px] uppercase tracking-[0.28em] text-[#8B5A2B]">
            本刊精选
          </span>
          <span class="h-px w-8 bg-[#E5E0D8]" />
          <span class="text-[10px] uppercase tracking-[0.24em] text-[#999999]">Featured</span>
        </div>

        <p class="mb-4 text-sm text-[#999999]">
          {{ article.readTime }}
        </p>

        <h2
          id="featured-title"
          class="mb-6 text-balance font-display text-[28px] leading-[1.25] text-[#1A1A1A] sm:text-[32px]"
        >
          <RouterLink
            :to="`/article/${article.id}`"
            class="transition-colors duration-300 hover:text-[#8B5A2B]"
          >
            {{ article.title }}
          </RouterLink>
        </h2>

        <!-- 首字下沉：用 first-letter 伪元素，不额外嵌套标签 -->
        <p
          class="mb-8 text-[16px] leading-[1.8] text-[#666666] first-letter:float-left first-letter:mr-2 first-letter:mt-[6px] first-letter:font-display first-letter:text-[54px] first-letter:leading-[0.78] first-letter:text-[#8B5A2B]"
        >
          {{ article.excerpt }}
        </p>

        <RouterLink
          :to="`/article/${article.id}`"
          class="group/link mb-8 inline-flex w-fit items-center gap-1.5 text-[14px] text-[#1A1A1A]"
        >
          <span class="border-b border-transparent pb-0.5 transition-colors duration-300 group-hover/link:border-[#8B5A2B]">
            阅读全文
          </span>
          <ArrowUpRight
            :size="15"
            :stroke-width="1.5"
            class="transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5"
          />
        </RouterLink>

        <div class="flex items-center gap-3 border-t border-[#E5E0D8] pt-6">
          <img
            v-if="article.author.avatar && !avatarFailed"
            :src="article.author.avatar"
            :alt="article.author.name"
            referrerpolicy="no-referrer"
            loading="lazy"
            class="h-9 w-9 rounded-full object-cover"
            @error="avatarFailed = true"
          />
          <span
            v-else
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFE9DF] text-[13px] text-[#8B5A2B]"
          >
            {{ article.author.name.slice(0, 1) }}
          </span>
          <div class="leading-tight">
            <p class="text-[13.5px] text-[#1A1A1A]">{{ article.author.name }}</p>
            <p class="mt-1 text-[12px] text-[#999999]">{{ article.author.role }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
