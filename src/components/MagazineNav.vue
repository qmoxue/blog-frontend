<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScroll } from '@vueuse/core'
import { Menu, Search, X } from 'lucide-vue-next'

/**
 * 导航项指向页面内的区块 id
 * ------------------------------------------------------------
 * ⚠️ 这里不能再用 `<a href="#archive">`。
 *   项目用的是 hash 路由，URL 里的 # 已经被路由占用了。
 *   点 href="#archive" 会把地址变成 #archive，路由匹配不到 → 直接白屏。
 *   所以改成「点击后滚动到对应区块」。
 */
const navItems = [
  { label: '首页', target: 'blogs' },
  { label: '专栏', target: 'columns' },
  { label: '归档', target: 'archive' },
  { label: '关于', target: 'about' },
]

const route = useRoute()
const router = useRouter()

const { y } = useScroll(window)
const scrolled = computed(() => y.value > 80)

/** 只有在首页时，「首页」才是高亮状态 */
const isHome = computed(() => route.path === '/')

const drawerOpen = ref(false)

watch(drawerOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

/**
 * 滚动到首页的某个区块
 * 如果当前在文章详情页，要先回首页，等它渲染完再滚
 */
async function goTo(target: string) {
  drawerOpen.value = false

  if (route.path !== '/') {
    await router.push('/')
    await nextTick()
    // 等一帧：首页卡片挂载后高度才确定，否则滚动位置会算错
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }

  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <header
    class="fixed left-0 right-0 top-0 z-50 h-16 backdrop-blur-md transition-[background-color,border-color] duration-300"
    :class="
      scrolled
        ? 'border-b border-[#E5E0D8] bg-[#F8F5F0]/95'
        : 'border-b border-transparent bg-[#F8F5F0]/80'
    "
  >
    <div class="mx-auto flex h-full max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
      <!-- 刊名 -->
      <button
        type="button"
        class="group flex items-baseline gap-2"
        aria-label="回到首页顶部"
        @click="goTo('blogs')"
      >
        <span class="font-display text-[22px] leading-none tracking-tight text-[#1A1A1A]">
          技刊
        </span>
        <span
          class="hidden text-[10px] uppercase tracking-[0.26em] text-[#999999] transition-colors duration-300 group-hover:text-[#8B5A2B] sm:inline"
        >
          TechMag
        </span>
      </button>

      <!-- 桌面导航 -->
      <nav class="hidden items-center gap-9 md:flex" aria-label="主导航">
        <button
          v-for="(item, i) in navItems"
          :key="item.label"
          type="button"
          class="group relative py-2 text-[15px] tracking-wide transition-colors duration-300"
          :class="
            i === 0 && isHome
              ? 'font-medium text-[#1A1A1A]'
              : 'font-normal text-[#666666] hover:text-[#1A1A1A]'
          "
          @click="goTo(item.target)"
        >
          {{ item.label }}
          <span
            class="absolute bottom-0 left-1/2 h-[2px] w-4 origin-center -translate-x-1/2 bg-[#8B5A2B] transition-transform duration-300"
            :class="i === 0 && isHome ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-150'"
          />
        </button>
      </nav>

      <!-- 功能区 -->
      <div class="flex items-center">
        <button
          type="button"
          aria-label="搜索"
          class="flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors duration-300 hover:bg-black/5 hover:text-[#1A1A1A]"
        >
          <Search :size="18" :stroke-width="1.6" />
        </button>

        <RouterLink
          to="/login"
          class="ml-4 hidden text-[15px] text-[#666666] transition-colors duration-300 hover:text-[#1A1A1A] md:inline"
        >
          登录
        </RouterLink>
        <RouterLink
          to="/register"
          class="ml-6 hidden text-[15px] font-medium text-[#8B5A2B] transition-colors duration-300 hover:text-[#6B4420] md:inline"
        >
          注册
        </RouterLink>

        <button
          type="button"
          aria-label="打开菜单"
          class="ml-2 flex h-9 w-9 items-center justify-center rounded-full text-[#1A1A1A] transition-colors duration-300 hover:bg-black/5 md:hidden"
          @click="drawerOpen = true"
        >
          <Menu :size="20" :stroke-width="1.6" />
        </button>
      </div>
    </div>

    <!-- 移动端抽屉：Teleport 到 body，避免被页眉的 backdrop-filter 限制定位 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="drawerOpen"
          class="fixed inset-0 z-[60] bg-[#1A1A1A]/25 backdrop-blur-[2px] md:hidden"
          @click="drawerOpen = false"
        />
      </Transition>

      <Transition name="drawer">
        <aside
          v-if="drawerOpen"
          class="fixed right-0 top-0 z-[70] flex h-full w-[78%] max-w-xs flex-col bg-[#F8F5F0] px-7 pb-10 pt-5 shadow-[0_0_60px_rgba(26,26,26,0.08)] md:hidden"
        >
        <div class="flex items-center justify-between">
          <span class="font-display text-[20px]">技刊</span>
          <button
            type="button"
            aria-label="关闭菜单"
            class="flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-black/5"
            @click="drawerOpen = false"
          >
            <X :size="18" :stroke-width="1.6" />
          </button>
        </div>

        <nav class="mt-10 flex flex-col" aria-label="移动端导航">
          <button
            v-for="(item, i) in navItems"
            :key="item.label"
            type="button"
            class="flex items-baseline justify-between border-b border-[#E5E0D8] py-4 text-left font-display text-[22px] text-[#1A1A1A]"
            @click="goTo(item.target)"
          >
            {{ item.label }}
            <span class="text-[10px] tracking-[0.2em] text-[#999999]">
              0{{ i + 1 }}
            </span>
          </button>
        </nav>

        <div class="mt-auto flex items-center gap-6 pt-8 text-[15px]">
          <RouterLink to="/login" class="text-[#666666]" @click="drawerOpen = false">登录</RouterLink>
          <span class="h-3 w-px bg-[#E5E0D8]" />
          <RouterLink to="/register" class="font-medium text-[#8B5A2B]" @click="drawerOpen = false">注册</RouterLink>
        </div>
      </aside>
      </Transition>
    </Teleport>
  </header>
</template>
