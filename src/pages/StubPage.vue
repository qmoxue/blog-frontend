<script setup lang="ts">
/**
 * 通用占位页
 * ------------------------------------------------------------
 * 两处用它：
 *   1. /login、/register —— 账号接口已经就绪，页面还没做
 *   2. 匹配不到任何路由时 —— 404
 *
 * 为什么要有它？
 *   导航栏里的「登录」「注册」如果还是 href="#login"，
 *   在 hash 路由下点击会把 URL 改成 #login，路由匹配不到就直接空白。
 *   宁可显示一个「正在建设中」的页面，也不要让用户看到白屏。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const route = useRoute()

const title = computed(() => (route.meta.title as string) || '这一页不存在')
const note = computed(() => (route.meta.note as string) || '')
</script>

<template>
  <div
    class="relative z-10 mx-auto flex min-h-[68vh] max-w-[1280px] flex-col items-center justify-center px-5 pt-28 text-center sm:px-8 lg:px-12"
  >
    <p class="text-[10px] uppercase tracking-[0.26em] text-[#8B5A2B]">TechMag</p>

    <h1 class="mt-7 font-display text-[32px] leading-tight text-[#1A1A1A] sm:text-[42px]">
      {{ title }}
    </h1>

    <p v-if="note" class="mt-5 max-w-md text-[14px] leading-[1.9] text-[#666666]">
      {{ note }}
    </p>

    <RouterLink
      to="/"
      class="group mt-10 inline-flex items-center gap-2 rounded-full border border-[#E5E0D8] px-5 py-2.5 text-[13.5px] text-[#1A1A1A] transition-colors duration-300 hover:border-[#8B5A2B] hover:text-[#8B5A2B]"
    >
      <ArrowLeft
        :size="15"
        :stroke-width="1.6"
        class="transition-transform duration-300 group-hover:-translate-x-0.5"
      />
      回到首页
    </RouterLink>
  </div>
</template>
