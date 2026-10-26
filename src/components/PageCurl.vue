<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 折角边长（px），随图片尺寸调整 */
    size?: number
  }>(),
  { size: 46 },
)
</script>

<template>
  <span class="curl" :style="{ '--curl-size': `${size}px` }" aria-hidden="true">
    <!-- 折痕投影：纸角离开页面后压在下方的暗部 -->
    <span class="curl__shade" />
    <!-- 纸背：沿对角线折回来的那一角 -->
    <span class="curl__paper" />
  </span>
</template>

<style scoped>
.curl {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 2;
  width: var(--curl-size);
  height: var(--curl-size);
  pointer-events: none;
}

/* ---------- 折痕投影 ---------- */
.curl__shade {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 100% 100%,
    rgba(26, 26, 26, 0.46) 0%,
    rgba(26, 26, 26, 0.24) 30%,
    rgba(26, 26, 26, 0.09) 50%,
    rgba(26, 26, 26, 0) 68%
  );
  opacity: 0;
  transform: scale(0.55);
  transform-origin: 100% 100%;
  transition:
    opacity 0.4s ease-out,
    transform 0.4s ease-out;
}

/* ---------- 纸背 ---------- */
.curl__paper {
  position: absolute;
  inset: 0;
  /* 右下角三角形：斜边就是折线 */
  clip-path: polygon(
    100% 0,
    91.1% 11.1%,
    81.9% 21.9%,
    72.5% 32.5%,
    62.9% 42.9%,
    53% 53%,
    42.9% 62.9%,
    32.5% 72.5%,
    21.9% 81.9%,
    11.1% 91.1%,
    0 100%,
    100% 100%
  );
  /*
   * 315deg 的 0% 在右下（纸角尖端），100% 在左上（折线）。
   * 尖端略暗 → 靠近折线处一道高光 → 折线压暗，
   * 三段明暗是「纸面在弯」的唯一提示，不加任何几何变形。
   */
  background: linear-gradient(
    315deg,
    #efe3cc 0%,
    #fdf7ea 24%,
    #f3e8d3 50%,
    #ddcbaa 80%,
    #c3ad86 96%,
    #b6a07a 100%
  );
  opacity: 0;
  transform-origin: 100% 100%;
  /* 从角尖往外展开，折线是「扫」出来的，不是淡入的 */
  transform: scale(0.18) rotate(-7deg);
  /* 第一层 1px 偏移 = 纸的厚度；第二层 = 翘起后落在图片上的影 */
  filter: drop-shadow(-1px -1px 0 rgba(104, 84, 58, 0.55))
    drop-shadow(-4px -5px 9px rgba(26, 26, 26, 0.28));
  transition:
    transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 0.32s ease-out;
}

/* 卡片整体 hover 时触发：.group 在 PostCard 的 article 上 */
.group:hover .curl__shade {
  opacity: 1;
  transform: scale(1);
}

.group:hover .curl__paper {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

/*
 * 触屏没有 hover：保持隐藏。
 * 给终态会让每张卡都带一个折角，反而成了噪声。
 */

@media (prefers-reduced-motion: reduce) {
  .curl__shade,
  .curl__paper {
    transition-duration: 1ms;
  }
}
</style>
