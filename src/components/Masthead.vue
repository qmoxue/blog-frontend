<script setup lang="ts">
defineProps<{
  issue?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <div
    class="mb-16 flex flex-col gap-8 border-b border-[#E5E0D8] pb-6 lg:flex-row lg:items-end lg:justify-between"
  >
    <div v-motion :initial="{ opacity: 0, y: 12 }" :visibleOnce="{
      opacity: 1,
      y: 0,
      transition: { duration: 800, delay: 60, ease: 'easeOut' },
    }">
      <p class="mb-4 text-sm tracking-[0.06em] text-[#999999]">
        {{ issue ?? '2025 年 · 第 9 期' }}
      </p>

      <!-- 刊头：首字放大下沉至标题的 1.8 倍，基线与标题对齐 -->
      <h1
        class="font-display pt-6 text-[56px] font-normal leading-none tracking-tight text-[#1A1A1A] sm:text-[72px]"
      >
        <span
          class="inline-block text-[1.8em] leading-[0.72] tracking-[-0.02em] align-baseline"
        >前</span>端技术录
      </h1>
    </div>

    <div
      v-motion
      :initial="{ opacity: 0, y: 12 }"
      :visibleOnce="{
        opacity: 1,
        y: 0,
        transition: { duration: 800, delay: 200, ease: 'easeOut' },
      }"
      class="max-w-md lg:text-right"
    >
      <p class="text-[15px] leading-relaxed text-[#666666] text-balance">
        {{ description ?? '聚焦前端工程实践、技术原理与职业成长，每月精选深度内容。' }}
      </p>
      <p class="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#999999]">
        Engineering · Design · Craft
      </p>
    </div>
  </div>
</template>
