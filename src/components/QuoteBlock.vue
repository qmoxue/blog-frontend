<script setup lang="ts">
import { ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import type { Quote } from '../types'

defineProps<{
  quote: Quote
}>()

const root = ref<HTMLElement | null>(null)
const drawn = ref(false)

const { stop } = useIntersectionObserver(
  root,
  ([entry]) => {
    if (!entry?.isIntersecting) return
    drawn.value = true
    stop()
  },
  { threshold: 0.35 },
)
</script>

<template>
  <figure ref="root" class="relative py-9 my-4 text-center sm:py-10">
    <!-- 上下分割线：进入视口时从中间向两端绘制 -->
    <span
      class="draw-line absolute left-0 top-0 h-px w-full bg-[#E5E0D8]"
      :class="{ 'is-drawn': drawn }"
    />
    <span
      class="draw-line absolute bottom-0 left-0 h-px w-full bg-[#E5E0D8]"
      :class="{ 'is-drawn': drawn }"
    />

    <span
      class="mx-auto mb-5 block h-[3px] w-6 bg-[#8B5A2B]/70 transition-opacity duration-700"
      :class="drawn ? 'opacity-100' : 'opacity-0'"
    />

    <blockquote
      class="mx-auto max-w-2xl font-display text-[20px] italic leading-[1.65] text-[#1A1A1A] transition-opacity duration-1000 sm:text-[24px]"
      :class="drawn ? 'opacity-100' : 'opacity-0'"
    >
      {{ quote.text }}
    </blockquote>

    <figcaption
      class="mt-4 text-[11px] uppercase tracking-[0.24em] text-[#999999] transition-opacity duration-1000 delay-150"
      :class="drawn ? 'opacity-100' : 'opacity-0'"
    >
      — {{ quote.source }}
    </figcaption>
  </figure>
</template>
