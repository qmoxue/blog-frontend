<script setup lang="ts">
import type { Column } from '../types'

defineProps<{
  columns: Column[]
}>()
</script>

<template>
  <section id="columns" class="mb-20 scroll-mt-24">
    <div class="mb-5 flex items-baseline justify-between border-b border-[#E5E0D8] pb-3">
      <h2 class="font-display text-[22px] leading-none text-[#1A1A1A]">本月专栏</h2>
      <span class="text-[10px] uppercase tracking-[0.26em] text-[#999999]">Columns</span>
    </div>

    <div class="grid gap-px bg-[#E5E0D8] sm:grid-cols-3">
      <a
        v-for="(column, i) in columns"
        :key="column.id"
        v-reveal="{ delay: i * 90 }"
        href="#archive"
        class="group flex flex-col gap-3 bg-[#F8F5F0] px-1 py-5 transition-colors duration-300 sm:px-6"
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
      </a>
    </div>
  </section>
</template>
