<script setup lang="ts">
/**
 * 登录 / 注册页的视觉外壳
 * ------------------------------------------------------------
 * 左边是"刊物"（刊头、主张、一段引文），右边是表单。
 * 这个不对称布局是杂志内页的常见做法：先立态度，再要动作。
 *
 * 为什么外壳单独抽出来？
 *   登录页和注册页的差别只有字段和文案，视觉结构完全一样。
 *   如果各写一份，以后调间距就要改两处 —— 迟早改漏一处。
 *
 * 移动端隐藏左栏：手机上垂直空间宝贵，
 * 让用户先看到表单，比先读一段刊物宣言重要。
 */
defineProps<{
  /** 小字眉标，如 "账号 · Account" */
  eyebrow: string
  /** 左栏的大标题 */
  title: string
  /** 大标题下面的说明文字 */
  lead: string
}>()
</script>

<template>
  <div class="relative z-10 mx-auto flex min-h-screen max-w-[1280px] px-5 pb-24 pt-28 sm:px-8 lg:px-12">
    <!--
      content-start / items-start 而不是居中，是一个刻意的选择：
      表单提交失败会多出几条错误文案，内容一长高，
      居中的布局会把整块内容往上顶 —— 用户点"提交"的瞬间，
      输入框在他眼皮底下跳了一格。顶部对齐就不会动。
      两栏都用 items-start，左右两栏的起始线也才对得齐。
    -->
    <div
      class="grid w-full flex-1 grid-cols-1 content-start items-start gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-x-20"
    >
      <!-- 左：刊头 -->
      <aside class="hidden lg:block lg:border-r lg:border-[#E5E0D8] lg:pr-20">
        <p class="text-[10px] uppercase tracking-[0.26em] text-[#8B5A2B]">
          {{ eyebrow }}
        </p>

        <h2
          class="text-balance mt-8 font-display text-[40px] leading-[1.16] tracking-tight text-[#1A1A1A] xl:text-[46px]"
        >
          {{ title }}
        </h2>

        <div class="mt-9 h-px w-14 bg-[#8B5A2B]/45" />

        <p class="mt-7 max-w-[22rem] text-[14px] leading-[1.95] text-[#666666]">
          {{ lead }}
        </p>

        <!--
          边栏引文：杂志内页常见的「页边注」。
          除了好看，它还有实际作用 —— 表单页内容少，
          左边一栏如果只有标题和两行说明，下方会空出很大一片，
          整页看起来像没加载完。这段引文把视觉重心压住了。
        -->
        <div class="mt-16 border-l border-[#8B5A2B]/30 pl-5">
          <p class="font-display text-[17px] leading-[1.7] text-[#666666]">
            把复杂讲清楚，
            <br />
            是一种稀缺能力。
          </p>
          <p class="mt-3 text-[10px] uppercase tracking-[0.22em] text-[#B4AA9C]">
            发刊词
          </p>
        </div>

        <p class="mt-14 text-[10px] uppercase tracking-[0.24em] text-[#B4AA9C]">
          技刊 · TechMag
        </p>
      </aside>

      <!-- 右：表单 -->
      <main class="w-full lg:max-w-[400px]">
        <slot />
      </main>
    </div>
  </div>
</template>
