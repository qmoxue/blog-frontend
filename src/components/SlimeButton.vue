<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const host = ref<HTMLButtonElement | null>(null)
const pathEl = ref<SVGPathElement | null>(null)

const w = ref(180)
const h = ref(46)

const hovered = ref(false)
const pressed = ref(false)

/** 圆角基准值，与 46px 高度配合成「柔和圆角矩形」 */
const BASE_R = 15
/** 边缘最大外鼓量（克制，不把文字区域挤变形） */
const MAX_BULGE = 5.5
/** 圆角最大浮动比例 */
const R_MAX = 0.32

const c1 = 0.5522847498

/**
 * 物理状态。全部是普通数字（非响应式），
 * 每帧直接 setAttribute 写 path，绕开 Vue 的响应式开销。
 */
const st = {
  // 指针平滑位置（弹簧跟随）
  px: 90,
  py: 23,
  vx: 0,
  vy: 0,
  // 目标指针位置
  tx: 90,
  ty: 23,
  // 形变总开关 0→1，控制「黏块出现/收回」的连续性
  amp: 0,
  ampv: 0,
  // 四条边的外鼓量 + 速度：top, right, bottom, left
  edge: [0, 0, 0, 0],
  edgev: [0, 0, 0, 0],
  // 四个圆角半径倍率 + 速度：tl, tr, br, bl
  rad: [1, 1, 1, 1],
  radv: [0, 0, 0, 0],
  // 四个角沿对角线的外扩量（黏块在角落被顶起）
  corner: [0, 0, 0, 0],
  cornerv: [0, 0, 0, 0],
}

let raf = 0
let reduced = false

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const prox = (d: number, span: number) => Math.pow(Math.max(0, 1 - d / span), 1.6)

/** 阻尼弹簧：cur/vel → target，返回下一帧的 [位置, 速度] */
const spring = (cur: number, vel: number, target: number, k: number, damp: number) => {
  const nextVel = (vel + (target - cur) * k) * damp
  return [cur + nextVel, nextVel] as const
}

/**
 * 生成整块软胶的外轮廓。
 * 一条闭合路径同时承担「圆角」与「边缘鼓包」，
 * 所以从静态圆角矩形到黏块形态是同一条曲线的参数变化，不存在跳变。
 */
const buildPath = (
  bw: number,
  bh: number,
  radii: number[],
  bulges: number[],
  corners: number[],
  mx: number,
  my: number,
) => {
  const [tl, tr, br, bl] = radii
  const [bt, brg, bb, blg] = bulges
  const [ct, ctr, cbr, cbl] = corners

  // 鼓包中心跟随指针在边上的投影，凸起才会「长在鼠标附近」
  const spanX = bw - tr - tl
  const spanY = bh - br - tl
  const topCx = spanX > 12 ? clamp(mx, tl + 6, bw - tr - 6) : bw / 2
  const bottomCx = spanX > 12 ? clamp(mx, bl + 6, bw - br - 6) : bw / 2
  const rightCy = spanY > 12 ? clamp(my, tr + 6, bh - br - 6) : bh / 2
  const leftCy = spanY > 12 ? clamp(my, tl + 6, bh - bl - 6) : bh / 2

  // 角沿 45° 对角线外扩（对角向量按 1/√2 归一）
  const d = Math.SQRT1_2
  const [otx, oty] = [-ct * d, -ct * d]
  const [orx, ory] = [ctr * d, -ctr * d]
  const [obx, oby] = [cbr * d, cbr * d]
  const [olx, oly] = [-cbl * d, cbl * d]

  // 每个角有两个锚点（进入角、离开角），同时位移保证路径连续
  const tlA = [tl + otx, oty]
  const tlB = [otx, tl + oty]
  const trA = [bw - tr + orx, ory]
  const trB = [bw + orx, tr + ory]
  const brA = [bw + obx, bh - br + oby]
  const brB = [bw - br + obx, bh + oby]
  const blA = [bl + olx, bh + oly]
  const blB = [olx, bh - bl + oly]

  // 每条边用双控点三次曲线：隆起沿边摊开成柔和弧面，
  // 而不是在一点上顶出一个尖包
  const spreadX = Math.max(8, spanX * 0.28)
  const spreadY = Math.max(5, spanY * 0.48)
  const topL = clamp(topCx - spreadX, tl + 2, bw - tr - 2)
  const topR = clamp(topCx + spreadX, tl + 2, bw - tr - 2)
  const botL = clamp(bottomCx - spreadX, bl + 2, bw - br - 2)
  const botR = clamp(bottomCx + spreadX, bl + 2, bw - br - 2)
  const rigT = clamp(rightCy - spreadY, tr + 2, bh - br - 2)
  const rigB = clamp(rightCy + spreadY, tr + 2, bh - br - 2)
  const lefT = clamp(leftCy - spreadY, tl + 2, bh - bl - 2)
  const lefB = clamp(leftCy + spreadY, tl + 2, bh - bl - 2)

  return [
    `M ${tlA[0]} ${tlA[1]}`,
    `C ${topL} ${-bt * 1.55} ${topR} ${-bt * 1.55} ${trA[0]} ${trA[1]}`,
    `C ${trA[0] + c1 * tr} ${trA[1]} ${trB[0]} ${trB[1] - c1 * tr} ${trB[0]} ${trB[1]}`,
    `C ${bw + brg * 1.55 + orx} ${rigT} ${bw + brg * 1.55 + orx} ${rigB} ${brA[0]} ${brA[1]}`,
    `C ${brA[0]} ${brA[1] + c1 * br} ${brB[0] + c1 * br} ${brB[1]} ${brB[0]} ${brB[1]}`,
    `C ${botL} ${bh + bb * 1.55 + oby} ${botR} ${bh + bb * 1.55 + oby} ${blA[0]} ${blA[1]}`,
    `C ${blA[0] - c1 * bl} ${blA[1]} ${blB[0]} ${blB[1] + c1 * bl} ${blB[0]} ${blB[1]}`,
    `C ${-blg * 1.55 + olx} ${lefT} ${-blg * 1.55 + olx} ${lefB} ${tlB[0]} ${tlB[1]}`,
    `C ${tlB[0]} ${tlB[1] - c1 * tl} ${tlA[0] - c1 * tl} ${tlA[1]} ${tlA[0]} ${tlA[1]}`,
    'Z',
  ].join(' ')
}

const paint = (d: string) => {
  pathEl.value?.setAttribute('d', d)
}

/** 完全静止时的标准圆角矩形 —— 保证「变回原始形状」是精确的，而不是近似 */
const restPath = () => {
  const bw = w.value
  const bh = h.value
  return buildPath(
    bw,
    bh,
    [BASE_R, BASE_R, BASE_R, BASE_R],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    bw / 2,
    bh / 2,
  )
}

const measure = () => {
  const el = host.value
  if (!el) return
  w.value = el.offsetWidth
  h.value = el.offsetHeight
  st.tx = w.value / 2
  st.ty = h.value / 2
  paint(restPath())
}

const tick = () => {
  const bw = w.value
  const bh = h.value
  const active = hovered.value && !reduced

  const targetAmp = active ? (pressed.value ? 1.28 : 1) : 0

  // 指针弹簧：移出时目标回到中心，黏块自然收拢
  const [npx, nvx] = spring(st.px, st.vx, active ? st.tx : bw / 2, 0.16, 0.76)
  const [npy, nvy] = spring(st.py, st.vy, active ? st.ty : bh / 2, 0.16, 0.76)
  st.px = npx
  st.vx = nvx
  st.py = npy
  st.vy = nvy

  const [namp, nav] = spring(st.amp, st.ampv, targetAmp, 0.1, 0.82)
  st.amp = namp
  st.ampv = nav

  // 四条边的邻近度：越靠近哪条边，哪条边鼓得越多
  const nTop = prox(st.py, bh * 0.62)
  const nBottom = prox(bh - st.py, bh * 0.62)
  const nLeft = prox(st.px, bw * 0.55)
  const nRight = prox(bw - st.px, bw * 0.55)

  // 速度带来的额外拉扯：甩动时前缘被拉长、后缘被拽回，
  // 这是「黏块被拖动」而不是「两边一起变胖」的关键
  const dragX = clamp(st.vx * 0.09, -3, 3)
  const dragY = clamp(st.vy * 0.09, -3, 3)

  const edgeTarget = [
    clamp((nTop * MAX_BULGE - dragY * 0.75) * st.amp, -MAX_BULGE, MAX_BULGE * 1.9),
    clamp((nRight * MAX_BULGE + dragX * 0.75) * st.amp, -MAX_BULGE, MAX_BULGE * 1.9),
    clamp((nBottom * MAX_BULGE + dragY * 0.75) * st.amp, -MAX_BULGE, MAX_BULGE * 1.9),
    clamp((nLeft * MAX_BULGE - dragX * 0.75) * st.amp, -MAX_BULGE, MAX_BULGE * 1.9),
  ]

  const cornerProx = [
    (nTop + nLeft) / 2,
    (nTop + nRight) / 2,
    (nBottom + nRight) / 2,
    (nBottom + nLeft) / 2,
  ]

  let settled = true

  for (let i = 0; i < 4; i += 1) {
    // 边缘弹性：阻尼偏低，带一点余震，像软胶
    const [ne, nev] = spring(st.edge[i], st.edgev[i], edgeTarget[i], 0.22, 0.68)
    st.edge[i] = ne
    st.edgev[i] = nev

    const radTarget = 1 + cornerProx[i] * R_MAX * st.amp
    const [nr, nrv] = spring(st.rad[i], st.radv[i], radTarget, 0.14, 0.78)
    st.rad[i] = nr
    st.radv[i] = nrv

    // 角沿对角线被顶起：越靠近哪个角，那个角鼓得越明显
    const cTarget = cornerProx[i] * 2.6 * st.amp
    const [nc, ncv] = spring(st.corner[i], st.cornerv[i], cTarget, 0.18, 0.72)
    st.corner[i] = nc
    st.cornerv[i] = ncv

    if (
      Math.abs(st.edge[i] - edgeTarget[i]) > 0.015 ||
      Math.abs(st.edgev[i]) > 0.015 ||
      Math.abs(st.rad[i] - radTarget) > 0.002 ||
      Math.abs(st.radv[i]) > 0.002 ||
      Math.abs(st.corner[i] - cTarget) > 0.015 ||
      Math.abs(st.cornerv[i]) > 0.015
    ) {
      settled = false
    }
  }

  if (Math.abs(st.amp - targetAmp) > 0.002 || Math.abs(st.ampv) > 0.002) settled = false

  if (settled && !active) {
    // 完全回到静止：落回精确的圆角矩形，然后停帧
    st.amp = 0
    st.ampv = 0
    st.edge = [0, 0, 0, 0]
    st.edgev = [0, 0, 0, 0]
    st.rad = [1, 1, 1, 1]
    st.radv = [0, 0, 0, 0]
    st.corner = [0, 0, 0, 0]
    st.cornerv = [0, 0, 0, 0]
    paint(restPath())
    raf = 0
    return
  }

  const maxR = bh / 2 - 0.5
  const radii = st.rad.map((m) => clamp(BASE_R * m, 6, maxR))
  paint(buildPath(bw, bh, radii, st.edge, st.corner, st.px, st.py))

  raf = requestAnimationFrame(tick)
}

const start = () => {
  if (!raf) raf = requestAnimationFrame(tick)
}

const onEnter = (e: PointerEvent) => {
  if (props.disabled) return
  hovered.value = true
  updatePointer(e)
  start()
}

const updatePointer = (e: PointerEvent) => {
  const el = host.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  st.tx = e.clientX - rect.left
  st.ty = e.clientY - rect.top
}

const onMove = (e: PointerEvent) => {
  if (props.disabled) return
  updatePointer(e)
  start()
}

const onLeave = () => {
  hovered.value = false
  pressed.value = false
  start()
}

const onDown = () => {
  if (props.disabled) return
  pressed.value = true
  start()
}

const onUp = () => {
  pressed.value = false
}

const onClick = () => {
  if (props.disabled) return
  emit('click')
}

let ro: ResizeObserver | null = null

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  measure()
  paint(restPath())
  ro = new ResizeObserver(measure)
  if (host.value) ro.observe(host.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  if (raf) cancelAnimationFrame(raf)
  raf = 0
})

watch(
  () => props.disabled,
  (d) => {
    if (d) {
      hovered.value = false
      pressed.value = false
      start()
    }
  },
)
</script>

<template>
  <button
    ref="host"
    type="button"
    class="slime"
    :class="{ 'is-disabled': disabled, 'is-live': hovered && !disabled }"
    :disabled="disabled"
    @pointerenter="onEnter"
    @pointermove="onMove"
    @pointerleave="onLeave"
    @pointerdown="onDown"
    @pointerup="onUp"
    @pointercancel="onUp"
    @click="onClick"
  >
    <!-- 软胶本体：整块容器的形状就画在这里 -->
    <svg class="slime__body" :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none" aria-hidden="true">
      <path ref="pathEl" class="slime__path" />
    </svg>

    <!-- 文字与装饰横线在软胶之上，不参与形变 -->
    <span class="slime__content">
      <span class="slime__label">{{ label }}</span>
      <span class="slime__rule">
        <span class="slime__rule-base" />
        <span class="slime__rule-ink" />
      </span>
    </span>
  </button>
</template>

<style scoped>
.slime {
  position: relative;
  display: inline-flex;
  border: 0;
  background: transparent;
  padding: 0;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}

.slime:not(.is-disabled) {
  cursor: pointer;
}

.slime__body {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  /* 形变时轮廓跟着柔和投影，凝胶感来自这里而不是描边 */
  filter: drop-shadow(0 2px 6px rgba(139, 90, 43, 0));
  transition: filter 600ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.slime.is-live .slime__body {
  filter: drop-shadow(0 6px 16px rgba(139, 90, 43, 0.13));
}

.slime__path {
  /* 浅半透底色：容器本身就是这块软泥 */
  fill: rgba(139, 90, 43, 0.055);
  transition: fill 480ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.slime.is-live .slime__path {
  fill: rgba(139, 90, 43, 0.1);
}

.slime.is-disabled .slime__path {
  fill: rgba(26, 26, 26, 0.028);
}

.slime:focus-visible {
  outline: none;
}

/* 键盘聚焦：描边跟着形变走，而不是套一个矩形外框 */
.slime:focus-visible .slime__path {
  stroke: rgba(139, 90, 43, 0.5);
  stroke-width: 1.5;
}

.slime__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 13px 30px 12px;
}

.slime__label {
  font-size: 15px;
  letter-spacing: 0.02em;
  line-height: 1;
  color: #666666;
  transition: color 320ms ease;
}

.slime.is-live .slime__label {
  color: #1a1a1a;
}

.slime.is-disabled .slime__label {
  color: #999999;
}

.slime__rule {
  position: relative;
  display: block;
  width: 100%;
  height: 1px;
}

.slime__rule-base {
  position: absolute;
  inset: 0;
  background: rgba(139, 90, 43, 0.16);
  transition: background-color 320ms ease;
}

.slime__rule-ink {
  position: absolute;
  inset: 0;
  background: #8b5a2b;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.slime.is-live .slime__rule-ink {
  transform: scaleX(1);
}

.slime.is-disabled .slime__rule-base {
  background: rgba(26, 26, 26, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .slime__path,
  .slime__body,
  .slime__label,
  .slime__rule-base,
  .slime__rule-ink {
    transition-duration: 1ms;
  }
}
</style>
