/**
 * 搜索逻辑
 * ------------------------------------------------------------
 * 一个输入框背后其实有四件事要同时成立，少一件用户就会觉得"这个搜索很怪"：
 *
 *   1. **别每敲一个字就发请求** —— 防抖
 *   2. **上一次请求要能取消**   —— 否则慢的回来会覆盖新的（竞态）
 *   3. **拼音上屏之前不能搜**   —— 输入法组合期
 *   4. **搜索词要进 URL**       —— 刷新、分享、后退都得还原
 *
 * 这四件事互相牵连，所以抽成一个组合式函数，而不是散在页面里。
 * 页面只负责"长什么样"，这里负责"什么时候搜、搜完怎么存"。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticles } from '../api/articles'
import { ApiError, CANCELED_CODE } from '../api/client'
import type { Article } from '../types'

/** 停手多久才发请求。太短没意义，太长会显得迟钝 */
const DEBOUNCE_MS = 300

/** 搜索结果一次取多少条。后端上限 50，超了直接 400 */
const PAGE_SIZE = 20

/**
 * 搜索的四种状态
 * ------------------------------------------------------------
 * 为什么不只用 `loading: boolean` + `results: []`？
 *   那样分不清"还没搜"和"搜了但没结果"。
 *   前者应该显示"输入关键词开始搜索"，后者应该显示"没有找到相关内容"——
 *   这两句话完全不同，用一个布尔值表达不出来。
 */
export type SearchStatus = 'idle' | 'searching' | 'done' | 'error'

export function useSearch() {
  const route = useRoute()
  const router = useRouter()

  /** 输入框里的原始值（可能是拼音，可能是半截词） */
  const keyword = ref(typeof route.query.q === 'string' ? route.query.q : '')

  const status = ref<SearchStatus>('idle')
  const results = ref<Article[]>([])
  const total = ref(0)
  const errorMessage = ref('')

  /** 输入法正在组合（拼音还没上屏） */
  const composing = ref(false)

  let debounceTimer: number | undefined
  /** 当前在飞的请求。新请求开始前先掐掉它 */
  let inflight: AbortController | null = null
  /**
   * 上一次**真正发出去**的查询词
   * ------------------------------------------------------------
   * 用来挡住重复请求。中文输入法上屏时，compositionend 和 input
   * 两条路径都会让 keyword 变一次，不去重就是同一个词发两次。
   */
  let lastQuery = ''

  /**
   * 真正发请求
   * ------------------------------------------------------------
   * 注意函数体开头的 `inflight?.abort()`：
   * 取消必须发生在**新请求发出之前**，不能等新结果回来再判断。
   * 因为网络是乱序的——先发的可能后到。
   */
  async function run(raw: string, opts: { force?: boolean } = {}): Promise<void> {
    const q = raw.trim()

    // 空关键词：取消在飞的请求，回到"还没搜"的状态
    if (!q) {
      inflight?.abort()
      inflight = null
      lastQuery = ''
      status.value = 'idle'
      results.value = []
      total.value = 0
      return
    }

    /**
     * 同一个词不重复发。
     * 出错时要放行（status === 'error'），否则重试按钮点了没反应。
     */
    if (!opts.force && q === lastQuery && status.value !== 'error') return

    inflight?.abort()
    inflight = null
    lastQuery = q

    const controller = new AbortController()
    inflight = controller
    status.value = 'searching'
    errorMessage.value = ''

    try {
      const page = await getArticles({ q, page: 1, pageSize: PAGE_SIZE }, controller.signal)

      /**
       * 双保险：即使 abort 因为某种原因没生效（比如响应已经解析完），
       * 这里还能拦住"过期结果覆盖新结果"。
       * 判断依据是「我还是不是最新的那个 controller」。
       */
      if (inflight !== controller) return

      results.value = page.list
      total.value = page.total
      status.value = 'done'
    } catch (err) {
      // 自己取消的，不是错误。什么都不做，连日志都不该打
      if (err instanceof ApiError && err.code === CANCELED_CODE) return
      if (inflight !== controller) return

      errorMessage.value = err instanceof Error ? err.message : '搜索失败，请稍后重试'
      status.value = 'error'
    } finally {
      if (inflight === controller) inflight = null
    }
  }

  /**
   * 把搜索词写进 URL
   * ------------------------------------------------------------
   * 用 replace 不用 push。
   * 如果每敲一个字都 push，用户按浏览器后退要按十几次才能离开搜索页——
   * 每一级历史记录都是同一个页面，只是关键词不同，这在体验上是灾难。
   */
  function syncUrl(value: string): void {
    const next = value.trim()
    const current = typeof route.query.q === 'string' ? route.query.q : ''
    if (next === current) return

    void router.replace({ query: next ? { q: next } : {} })
  }

  watch(keyword, (value) => {
    /**
     * 输入法组合期间直接返回。
     * 这段的 value 是拼音字母（比如 "sousuo"），搜出来一定是空，
     * 而且会把上一次的真实结果冲掉，屏幕会闪。
     */
    if (composing.value) return

    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      syncUrl(value)
      void run(value)
    }, DEBOUNCE_MS)
  })

  /** 外部改了 URL（比如点了别处的标签跳过来），同步回输入框 */
  watch(
    () => route.query.q,
    (value) => {
      const next = typeof value === 'string' ? value : ''
      if (next === keyword.value) return
      keyword.value = next
    },
  )

  function onCompositionStart(): void {
    composing.value = true
  }

  /**
   * 上屏后立即搜，不再等 300ms
   * ------------------------------------------------------------
   * 用户已经"停"过一次了（选词这个动作本身就是停顿），
   * 再等 300ms 会明显觉得卡。
   *
   * ⚠️ 必须等一个 tick 再读 keyword。
   *   `compositionend` 和 `input` 的先后顺序**各浏览器不一致**：
   *     Chrome 实测：compositionend 先，input 后
   *     部分输入法/浏览器：input 先，compositionend 后
   *   如果在这里同步读 keyword.value，遇到"compositionend 先"的情况
   *   拿到的还是拼音（上屏前的值），会先搜一次拼音再搜一次中文。
   *   nextTick 之后 v-model 已经写完了，读到的一定是上屏后的值。
   */
  function onCompositionEnd(): void {
    composing.value = false

    void nextTick(() => {
      window.clearTimeout(debounceTimer)
      syncUrl(keyword.value)
      void run(keyword.value)
    })
  }

  /** 手动重试（错误态下的按钮）。force 是因为同一个词必须允许重发 */
  function retry(): void {
    void run(keyword.value, { force: true })
  }

  /** 按回车：跳过防抖立刻搜 */
  function searchNow(): void {
    window.clearTimeout(debounceTimer)
    syncUrl(keyword.value)
    void run(keyword.value)
  }

  function clear(): void {
    keyword.value = ''
    window.clearTimeout(debounceTimer)
    syncUrl('')
    void run('')
  }

  onMounted(() => {
    // 从 URL 进来的（刷新 / 分享链接），直接搜，不用等防抖
    if (keyword.value.trim()) void run(keyword.value)
  })

  onBeforeUnmount(() => {
    window.clearTimeout(debounceTimer)
    inflight?.abort()
    inflight = null
  })

  return {
    keyword,
    status,
    results,
    total,
    errorMessage,
    composing,
    onCompositionStart,
    onCompositionEnd,
    searchNow,
    retry,
    clear,
  }
}
