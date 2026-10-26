<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScroll } from '@vueuse/core'
import { Menu, Search, X } from 'lucide-vue-next'
import { useAuth } from '../stores/auth'
import { goToHomeSection } from '../utils/scroll'

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

/**
 * 登录态
 * ------------------------------------------------------------
 * 这里是全局单例 store，所以登录页登录成功后，导航栏会立刻变 —— 不用手动刷新。
 */
const auth = useAuth()

/**
 * 还在探测登录态吗？
 * 是的话先渲染一个灰条占位。
 * 不占位的话，首屏会先显示「登录 / 注册」，几百毫秒后又突然变成用户名，
 * 这个闪动比多等一会儿更难受，而且会让已经登录的用户以为自己被登出了。
 */
const authPending = computed(() => auth.state.status === 'idle' || auth.state.status === 'probing')

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
 * 具体逻辑在 utils/scroll.ts —— 页脚和专栏卡片也用同一份
 */
async function goTo(target: string) {
  drawerOpen.value = false
  await goToHomeSection(router, route.path, target)
}

/**
 * 登出
 * signOut 内部无论后端是否确认成功都会清本地状态，
 * 所以这里不用判断返回值：用户点了退出，界面就必须变成未登录。
 */
async function onSignOut() {
  drawerOpen.value = false
  await auth.signOut()
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

        <!-- 登录态区域：三种形态（探测中 / 已登录 / 未登录）互斥 -->
        <div class="ml-4 hidden items-center gap-5 md:flex">
          <!-- 探测中：占位灰条。宁可空着，也不要闪一下错的按钮 -->
          <span
            v-if="authPending"
            class="h-3.5 w-[68px] animate-pulse rounded-full bg-[#E5E0D8]"
            aria-hidden="true"
          />

          <template v-else-if="auth.state.user">
            <span class="flex items-center gap-2">
              <span
                class="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFE9DF] text-[12px] leading-none text-[#8B5A2B]"
              >
                {{ auth.state.user.name.slice(0, 1) }}
              </span>
              <span class="max-w-[7rem] truncate text-[14.5px] text-[#1A1A1A]">
                {{ auth.state.user.name }}
              </span>
            </span>
            <button
              type="button"
              class="text-[14px] text-[#666666] transition-colors duration-300 hover:text-[#1A1A1A]"
              @click="onSignOut"
            >
              登出
            </button>
          </template>

          <template v-else>
            <RouterLink
              to="/login"
              class="text-[15px] text-[#666666] transition-colors duration-300 hover:text-[#1A1A1A]"
            >
              登录
            </RouterLink>
            <RouterLink
              to="/register"
              class="text-[15px] font-medium text-[#8B5A2B] transition-colors duration-300 hover:text-[#6B4420]"
            >
              注册
            </RouterLink>
          </template>
        </div>

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

        <div class="mt-auto flex items-center gap-5 pt-8 text-[15px]">
          <template v-if="auth.state.user">
            <span class="flex items-center gap-2 text-[#1A1A1A]">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFE9DF] text-[13px] leading-none text-[#8B5A2B]"
              >
                {{ auth.state.user.name.slice(0, 1) }}
              </span>
              <span class="max-w-[8rem] truncate">{{ auth.state.user.name }}</span>
            </span>
            <button
              type="button"
              class="ml-auto text-[#666666] transition-colors hover:text-[#1A1A1A]"
              @click="onSignOut"
            >
              登出
            </button>
          </template>

          <template v-else-if="!authPending">
            <RouterLink to="/login" class="text-[#666666]" @click="drawerOpen = false">登录</RouterLink>
            <span class="h-3 w-px bg-[#E5E0D8]" />
            <RouterLink to="/register" class="font-medium text-[#8B5A2B]" @click="drawerOpen = false">注册</RouterLink>
          </template>
        </div>
      </aside>
      </Transition>
    </Teleport>
  </header>
</template>
