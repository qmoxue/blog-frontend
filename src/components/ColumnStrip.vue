<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import type { Column } from '../types'
import { goToHomeSection } from '../utils/scroll'

defineProps<{
  columns: Column[]
}>()

const route = useRoute()
const router = useRouter()

/**
 * 点专栏卡片 → 滚到「归档」区块
 * 真正该做的是按专栏筛选文章，但筛选接口还没接，先保证点了有反应。
 *
 * ⚠️ 原来这里是 `<a href="#archive">`，在 hash 路由下会变成 404。
 *   所以改成了按钮。
 */
function openArchive() {
  goToHomeSection(router, route.path, 'archive')
}
</script>

<template>
  <section id="columns" class="mb-20 scroll-mt-24">
    <div class="mb-5 flex items-baseline justify-between border-b border-[#E5E0D8] pb-3">
      <h2 class="font-display text-[22px] leading-none text-[#1A1A1A]">本月专栏</h2>
      <span class="text-[10px] uppercase tracking-[0.26em] text-[#999999]">Columns</span>
    </div>

    <div class="grid gap-px bg-[#E5E0D8] sm:grid-cols-3">
      <button
        v-for="(column, i) in columns"
        :key="column.id"
        v-reveal="{ delay: i * 90 }"
        type="button"
        class="group flex w-full flex-col gap-3 bg-[#F8F5F0] px-1 py-5 text-left transition-colors duration-300 sm:px-6"
        @click="openArchive"
      >
        <div class="flex items-baseline justify-between">
          <span class="font-display text-[12px] tracking-[0.1em] text-[#8B5A2B]">
            {{ column.index }}
          </span>
          <span class="text-[11px] text-[#999999]">{{ column.count }} 篇</span>
        </div>

        <h3
          class="font-display text-[19px] leading-none text-[#1A1A1A] transition-colors duration-300 group-hover:text-[#8B5A2B]"
        >
          {{ column.name }}
        </h3>

        <p class="text-[13px] leading-relaxed text-[#666666]">
          {{ column.description }}
        </p>
      </button>
    </div>
  </section>
</template>
