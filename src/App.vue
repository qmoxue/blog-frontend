<script setup lang="ts">
/**
 * 应用外壳
 * ------------------------------------------------------------
 * 这一层只负责「所有页面都有的东西」：页眉导航 + 路由出口 + 刊尾。
 * 具体页面内容交给 pages/ 下的组件。
 *
 * 为什么要把内容拆出去？
 *   路由需要一个出口（RouterView）。如果首页内容还留在这里，
 *   那么点进文章详情时首页内容会一直在，只能靠 v-if 手动切换 —— 
 *   那就等于自己实现了一遍路由。
 *
 * 注意这里**没有** select-none。
 *   原来根节点带 select-none，导致正文不能被选中复制，
 *   这是个缺陷不是设计。阅读类页面必须允许选中文字。
 */
import MagazineNav from './components/MagazineNav.vue'
import { scrollToSection } from './utils/scroll'
</script>

<template>
  <section
    id="blogs"
    class="paper-grain relative min-h-screen w-full bg-[#F8F5F0] text-[#1A1A1A]"
  >
    <MagazineNav />

    <RouterView />

    <!-- 刊尾：所有页面共用 -->
    <div class="relative z-10 mx-auto max-w-[1280px] px-5 pb-24 sm:px-8 lg:px-12">
      <footer
        id="about"
        class="mt-20 flex scroll-mt-24 flex-col gap-6 border-t border-[#E5E0D8] pt-8 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p class="font-display text-[20px] leading-none text-[#1A1A1A]">
            技刊 TechMag
          </p>
          <p class="mt-3 text-[13px] leading-relaxed text-[#999999]">
            一份关于前端工程与设计的独立刊物 · 每月九日更新
          </p>
        </div>

        <!--
          ⚠️ 这里原来写的是 `<a href="#about">`，在 hash 路由下点一下就会
          把地址变成 #about，路由匹配不到 → 直接掉进 404 页。
          改成按钮 + scrollToSection，和导航栏用同一份逻辑。
          （这三个入口目前都是占位：真正的「关于」「投稿」「订阅」页面还没做，
            先滚动到刊尾，至少不会把人送到 404）
        -->
        <div class="flex items-center gap-6 text-[13px] text-[#666666]">
          <button
            type="button"
            class="transition-colors duration-300 hover:text-[#8B5A2B]"
            @click="scrollToSection('about')"
          >
            关于本刊
          </button>
          <span class="h-3 w-px bg-[#E5E0D8]" />
          <button
            type="button"
            class="transition-colors duration-300 hover:text-[#8B5A2B]"
            @click="scrollToSection('about')"
          >
            投稿
          </button>
          <span class="h-3 w-px bg-[#E5E0D8]" />
          <button
            type="button"
            class="transition-colors duration-300 hover:text-[#8B5A2B]"
            @click="scrollToSection('about')"
          >
            订阅
          </button>
        </div>
      </footer>
    </div>
  </section>
</template>
