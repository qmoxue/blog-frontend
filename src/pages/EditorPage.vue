<script setup lang="ts">
/**
 * 作者编辑器
 * ------------------------------------------------------------
 * 两个入口共用这一个组件：
 *   /editor        新建（props.id 为 undefined）
 *   /editor/:id    编辑（props.id 有值）
 *
 * 为什么用同一个组件而不是两个页面？
 *   两个页面的字段、校验、上传、草稿逻辑完全一样，只有「提交到哪个接口」不同。
 *   拆成两个文件，改一个校验规则就要改两处，必然漂移。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ArrowLeft, Eye, ImagePlus, Loader2, PenLine, Trash2 } from 'lucide-vue-next'
import {
  createArticle,
  getArticleForEdit,
  getColumns,
  updateArticle,
  uploadCover,
  type ArticleInput,
} from '../api/articles'
import { ApiError } from '../api/client'
import { useAuth } from '../stores/auth'
import { renderMarkdown } from '../utils/markdown'
import { toSubmitFailure } from '../utils/formErrors'
import { validateArticleForm, validateCoverPath, type FieldErrors } from '../utils/validators'
import type { Column } from '../types'

const props = defineProps<{ id?: string }>()

const router = useRouter()
const auth = useAuth()

const isEdit = computed(() => Boolean(props.id))

/** 只有作者能进。后端也会拦（403），这里只决定界面 */
const canWrite = computed(() => auth.state.user?.isAuthor === true)

// ------------------------------------------------------------------
// 表单
// ------------------------------------------------------------------

const now = new Date()

const form = reactive({
  title: '',
  excerpt: '',
  content: '',
  cover: '',
  /** 标签在界面上是一个「逗号分隔」的输入框，提交时才拆成数组 */
  tagsText: '',
  year: now.getFullYear(),
  /** 默认当前月，符合"月刊"的直觉 */
  issue: now.getMonth() + 1,
  columnId: '',
})

/** 逗号（中英文）或空格分隔 → 去空、去重、去首尾空白 */
const tagList = computed(() => {
  const raw = form.tagsText
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  return [...new Set(raw)]
})

const charCount = computed(() => form.content.trim().length)

/**
 * 阅读时长估算
 * ------------------------------------------------------------
 * 中文阅读速度大约每分钟 300–400 字，取 400 偏保守（算短一点不会让人觉得被骗）。
 * 后端字段范围是 1–600，这里用 Math.max 保证至少 1 分钟。
 */
const readTime = computed(() => Math.max(1, Math.round(charCount.value / 400)))

// ------------------------------------------------------------------
// 状态
// ------------------------------------------------------------------

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const mode = ref<'write' | 'preview'>('write')

const errors = ref<FieldErrors>({})
const topError = ref('')
const coverError = ref('')

/** 页面级错误：文章不存在 / 网络失败 / 没有权限 */
const pageError = ref('')

const columns = ref<Column[]>([])

/** 有未保存的修改（用来拦「离开页面」和「关闭标签页」） */
const dirty = ref(false)

/** 本地草稿的保存时间，有值就显示"已恢复草稿"的提示条 */
const draftRestoredAt = ref<Date | null>(null)

/**
 * 服务端的原始快照
 * 「丢弃草稿」要能回到这里，否则用户没法摆脱一份错误草稿
 */
const snapshot = reactive({ ...form })

/** 表单是否已经完成初始化。初始化期间的 watch 不该写草稿 */
let hydrated = false

// ------------------------------------------------------------------
// 本地草稿
// ------------------------------------------------------------
// ⚠️ 后端**没有**草稿状态字段（Article 模型里没有 status）。
//   加一个 status 会牵动列表查询、归档统计、详情页权限，属于破坏性改动。
//   所以草稿只存在浏览器本地：刷新、误关标签页都能救回来，
//   但它不是"云端草稿"——换设备就没了。这个边界要在界面上说清楚。
// ------------------------------------------------------------------

const draftKey = computed(() => `techmag:editor:${props.id ?? 'new'}`)

interface Draft {
  savedAt: number
  form: typeof form
}

/** 读草稿。localStorage 在隐私模式/配额满时会抛异常，必须包起来 */
function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey.value)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Draft
    if (!parsed?.form || typeof parsed.form !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

let draftTimer: number | undefined

function persistDraft() {
  try {
    const payload: Draft = { savedAt: Date.now(), form: { ...form } }
    window.localStorage.setItem(draftKey.value, JSON.stringify(payload))
  } catch {
    // 写不进去就算了，不能因为草稿失败把编辑器搞崩
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(draftKey.value)
  } catch {
    /* 同上 */
  }
  draftRestoredAt.value = null
}

/** 把草稿盖到表单上 */
function applyDraft(draft: Draft) {
  Object.assign(form, draft.form)
  draftRestoredAt.value = new Date(draft.savedAt)
  dirty.value = true
}

/** 丢弃草稿：回到服务端快照 */
function discardDraft() {
  Object.assign(form, snapshot)
  clearDraft()
  dirty.value = false
  errors.value = {}
}

// 深度监听：任何字段改动都算 dirty，并延迟写草稿
watch(
  form,
  () => {
    if (!hydrated) return
    dirty.value = true
    window.clearTimeout(draftTimer)
    // 800ms 防抖：连续打字时不要每个字符都写一次 localStorage（同步 API，会卡输入）
    draftTimer = window.setTimeout(persistDraft, 800)
  },
  { deep: true },
)

// ------------------------------------------------------------------
// 加载
// ------------------------------------------------------------------

async function loadColumns() {
  try {
    columns.value = await getColumns()
  } catch {
    // 专栏拉不到不该挡住写稿：降级成"不选专栏"，后端允许 column 为 null
    columns.value = []
  }
}

async function load() {
  // 先读草稿：即使文章加载失败，本地草稿也能让用户继续写
  const draft = readDraft()

  if (!props.id) {
    Object.assign(snapshot, form)
    if (draft) applyDraft(draft)
    hydrated = true
    return
  }

  loading.value = true
  pageError.value = ''

  try {
    const data = await getArticleForEdit(props.id)

    /**
     * 权限前置判断
     * ------------------------------------------------------------
     * 后端只在 PATCH 时校验"是不是你写的"。如果不在这里拦，
     * 作者 A 打开作者 B 的文章、认真改半小时、点保存 → 403，全白费。
     */
    const me = auth.state.user
    if (me && data.authorId && data.authorId !== me.id) {
      pageError.value = '这篇文章不是你写的，无法编辑。'
      return
    }

    Object.assign(form, {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      cover: data.cover,
      tagsText: data.tags.join(', '),
      year: data.year,
      issue: data.issue,
      columnId: data.columnId ?? '',
    })
    Object.assign(snapshot, form)

    if (draft) applyDraft(draft)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      pageError.value = '这篇文章不存在，可能已经被删除。'
    } else if (err instanceof ApiError && err.status === 403) {
      pageError.value = '没有权限编辑这篇文章。'
    } else {
      pageError.value = err instanceof Error ? err.message : '加载失败'
    }
  } finally {
    loading.value = false
    hydrated = true
  }
}

// ------------------------------------------------------------------
// 封面
// ------------------------------------------------------------------

const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** 和后端 MAX_UPLOAD_SIZE 保持一致（默认 2MB） */
const COVER_MAX = 2 * 1024 * 1024

async function onPickCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  coverError.value = ''

  // 本地先拦一次：省一次网络往返，也避免把 2MB 传上去才被拒
  if (!COVER_TYPES.includes(file.type)) {
    coverError.value = '只支持 jpg / png / webp 格式的图片'
    input.value = ''
    return
  }
  if (file.size > COVER_MAX) {
    coverError.value = '图片不能超过 2MB'
    input.value = ''
    return
  }

  uploading.value = true
  try {
    const { url } = await uploadCover(file)
    form.cover = url
  } catch (err) {
    coverError.value = err instanceof ApiError ? err.message : '上传失败，请重试'
  } finally {
    uploading.value = false
    // 清空 input，否则再选同一个文件不会触发 change 事件
    input.value = ''
  }
}

function removeCover() {
  form.cover = ''
  coverError.value = ''
}

// ------------------------------------------------------------------
// 提交
// ------------------------------------------------------------------

function buildPayload(): ArticleInput {
  const payload: ArticleInput = {
    title: form.title.trim(),
    // 正文保留原样：Markdown 里的缩进和空行是有意义的，trim 会破坏代码块
    content: form.content,
    year: Number(form.year),
    issue: Number(form.issue),
    readTime: readTime.value,
    column: form.columnId || null,
  }

  const excerpt = form.excerpt.trim()
  if (excerpt) payload.excerpt = excerpt
  if (form.cover) payload.cover = form.cover
  if (tagList.value.length > 0) payload.tags = tagList.value

  return payload
}

async function submit() {
  if (saving.value) return

  topError.value = ''
  errors.value = {}

  // 前端校验只为即时反馈，后端 zod 才是权威
  const found = validateArticleForm({
    title: form.title,
    content: form.content,
    excerpt: form.excerpt,
    tags: tagList.value,
    year: Number(form.year),
    issue: Number(form.issue),
  })

  const coverMsg = validateCoverPath(form.cover)
  if (coverMsg) found.cover = coverMsg

  if (Object.keys(found).length > 0) {
    errors.value = found
    topError.value = '还有几处需要修改'
    return
  }

  saving.value = true
  try {
    const payload = buildPayload()
    const saved = isEdit.value
      ? await updateArticle(props.id as string, payload)
      : await createArticle(payload)

    // 保存成功：清掉 dirty 和草稿，否则离开时还会弹"未保存"提示
    dirty.value = false
    window.clearTimeout(draftTimer)
    clearDraft()

    // 跳到文章详情页，让作者立刻看到成品
    await router.push(`/article/${saved.id}`)
  } catch (err) {
    const failure = toSubmitFailure(err, [
      'title',
      'content',
      'excerpt',
      'cover',
      'tags',
      'readTime',
      'year',
      'issue',
      'column',
    ])
    errors.value = failure.fields
    topError.value = failure.message

    // 401：登录过期了，带原地址去登录
    if (err instanceof ApiError && (err.code === 40101 || err.code === 40102)) {
      await router.push({ name: 'login', query: { redirect: '/editor' } })
    }
  } finally {
    saving.value = false
  }
}

// ------------------------------------------------------------------
// 离开保护
// ------------------------------------------------------------------

/**
 * 关闭标签页 / 刷新
 * 注意：现代浏览器**不允许**自定义文案，只能由浏览器显示一句通用提示。
 * 这里只能决定"要不要拦"，不能决定"说什么"。
 */
function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

/**
 * 站内路由跳转
 * 草稿已经自动存在本地，所以文案里要说清楚，避免用户以为内容丢了。
 */
onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return window.confirm('这篇稿子还有未保存的修改（本地草稿已自动保存），确定离开吗？')
})

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload)
  loadColumns()
  load()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.clearTimeout(draftTimer)
})

// ------------------------------------------------------------------
// 派生
// ------------------------------------------------------------------

const previewHtml = computed(() => renderMarkdown(form.content))

const draftHint = computed(() => {
  if (!draftRestoredAt.value) return ''
  const t = draftRestoredAt.value
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  return `已恢复 ${hh}:${mm} 的本地草稿`
})
</script>

<template>
  <div class="min-h-screen bg-[#F8F5F0] pb-32 pt-24">
    <div class="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
      <!-- 顶部工具条 -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D8] pb-5">
        <button
          type="button"
          class="group flex items-center gap-2 text-[13px] text-[#666666] transition-colors duration-300 hover:text-[#8B5A2B]"
          @click="router.back()"
        >
          <ArrowLeft :size="15" class="transition-transform duration-300 group-hover:-translate-x-0.5" />
          返回
        </button>

        <p class="text-[10px] uppercase tracking-[0.26em] text-[#8B5A2B]">
          {{ isEdit ? '编辑稿件' : '撰写新稿' }}
        </p>

        <div class="flex items-center gap-3">
          <!-- 写作 / 预览 切换 -->
          <div class="flex items-center rounded-full border border-[#E5E0D8] p-0.5">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors duration-300"
              :class="mode === 'write' ? 'bg-[#1A1A1A] text-[#F8F5F0]' : 'text-[#666666] hover:text-[#1A1A1A]'"
              @click="mode = 'write'"
            >
              <PenLine :size="13" />
              写作
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition-colors duration-300"
              :class="mode === 'preview' ? 'bg-[#1A1A1A] text-[#F8F5F0]' : 'text-[#666666] hover:text-[#1A1A1A]'"
              @click="mode = 'preview'"
            >
              <Eye :size="13" />
              预览
            </button>
          </div>

          <button
            type="button"
            class="flex items-center gap-2 rounded-full bg-[#8B5A2B] px-6 py-2.5 text-[13px] font-medium text-[#F8F5F0] transition-all duration-300 hover:bg-[#6B4420] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="saving || !canWrite || Boolean(pageError)"
            @click="submit"
          >
            <Loader2 v-if="saving" :size="14" class="animate-spin" />
            {{ saving ? '保存中' : isEdit ? '保存修改' : '发布' }}
          </button>
        </div>
      </div>

      <!-- 状态提示 -->
      <div v-if="draftHint" class="mt-5 flex items-center justify-between gap-4 border border-[#E5E0D8] bg-[#EFE9DF] px-4 py-2.5">
        <p class="text-[12px] text-[#6B4420]">{{ draftHint }}</p>
        <button
          type="button"
          class="flex items-center gap-1 text-[12px] text-[#8B5A2B] underline-offset-4 hover:underline"
          @click="discardDraft"
        >
          <Trash2 :size="12" />
          丢弃草稿
        </button>
      </div>

      <p v-if="topError" role="alert" class="mt-5 border-l-2 border-[#A6482F] bg-[#F3E7E2] px-4 py-2.5 text-[13px] text-[#A6482F]">
        {{ topError }}
      </p>

      <!-- 没有作者权限 -->
      <div v-if="!canWrite" class="mt-16 max-w-xl">
        <h1 class="font-display text-[30px] leading-tight text-[#1A1A1A]">需要作者权限</h1>
        <p class="mt-5 text-[14px] leading-[1.95] text-[#666666]">
          当前账号是读者身份，只能阅读。想发稿请用作者账号登录，或者重新注册时选择「作者」。
        </p>
        <RouterLink
          to="/login"
          class="mt-8 inline-block rounded-full bg-[#8B5A2B] px-6 py-2.5 text-[13px] font-medium text-[#F8F5F0]"
        >
          切换账号
        </RouterLink>
      </div>

      <!-- 页面级错误 -->
      <div v-else-if="pageError" class="mt-16 max-w-xl">
        <h1 class="font-display text-[30px] leading-tight text-[#1A1A1A]">打不开这篇稿子</h1>
        <p class="mt-5 text-[14px] leading-[1.95] text-[#666666]">{{ pageError }}</p>
        <RouterLink to="/" class="mt-8 inline-block text-[13px] text-[#8B5A2B] underline-offset-4 hover:underline">
          回首页
        </RouterLink>
      </div>

      <!-- 加载中 -->
      <div v-else-if="loading" class="mt-10 animate-pulse space-y-5">
        <div class="h-9 w-2/3 rounded bg-[#EFE9DF]" />
        <div class="h-4 w-1/2 rounded bg-[#EFE9DF]" />
        <div class="h-64 rounded bg-[#EFE9DF]" />
      </div>

      <!-- 主表单 -->
      <div v-else class="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <!-- 左：标题 / 摘要 / 正文 -->
        <div class="min-w-0">
          <label for="editor-title" class="sr-only">标题</label>
          <input
            id="editor-title"
            v-model="form.title"
            type="text"
            maxlength="120"
            placeholder="标题"
            class="w-full border-0 border-b border-transparent bg-transparent pb-3 font-display text-[32px] leading-[1.25] tracking-tight text-[#1A1A1A] outline-none transition-colors duration-300 placeholder:text-[#C4BBAD] focus:border-[#E5E0D8] sm:text-[36px]"
            :class="errors.title ? 'border-b-[#A6482F]' : ''"
          />
          <p v-if="errors.title" class="mt-2 text-[12px] text-[#A6482F]">{{ errors.title }}</p>

          <label for="editor-excerpt" class="sr-only">摘要</label>
          <textarea
            id="editor-excerpt"
            v-model="form.excerpt"
            rows="2"
            maxlength="200"
            placeholder="摘要（可选，列表页会显示这一句）"
            class="mt-6 w-full resize-none border-0 bg-transparent text-[14px] leading-[1.9] text-[#666666] outline-none placeholder:text-[#B4AA9C]"
          />
          <p v-if="errors.excerpt" class="mt-1 text-[12px] text-[#A6482F]">{{ errors.excerpt }}</p>

          <div class="mt-6 border-t border-[#E5E0D8] pt-6">
            <!-- 预览：和详情页用同一个渲染函数，所见即所得 -->
            <div v-if="mode === 'preview'" class="md-preview min-h-[420px]">
              <p v-if="!form.content.trim()" class="text-[14px] text-[#B4AA9C]">正文还是空的，切回「写作」开始。</p>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-else v-html="previewHtml" />
            </div>

            <template v-else>
              <label for="editor-content" class="sr-only">正文（Markdown）</label>
              <textarea
                id="editor-content"
                v-model="form.content"
                rows="22"
                placeholder="正文，支持 Markdown：## 小标题、**加粗**、`代码`、> 引用"
                class="w-full resize-y border-0 bg-transparent font-mono text-[13.5px] leading-[2] text-[#1A1A1A] outline-none placeholder:text-[#B4AA9C]"
              />
              <p v-if="errors.content" class="mt-1 text-[12px] text-[#A6482F]">{{ errors.content }}</p>
            </template>
          </div>
        </div>

        <!-- 右：刊物信息 -->
        <aside class="space-y-7 lg:border-l lg:border-[#E5E0D8] lg:pl-10">
          <p class="text-[10px] uppercase tracking-[0.24em] text-[#8B5A2B]">刊物信息</p>

          <!-- 年 + 期 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="editor-year" class="block text-[11px] text-[#8B5A2B]">年份</label>
              <input
                id="editor-year"
                v-model.number="form.year"
                type="number"
                min="1900"
                max="2100"
                class="mt-1.5 w-full border-b border-[#D8D0C4] bg-transparent pb-1.5 text-[14px] text-[#1A1A1A] outline-none transition-colors duration-300 focus:border-b-[#8B5A2B]"
                :class="errors.year ? 'border-b-[#A6482F]' : ''"
              />
              <p v-if="errors.year" class="mt-1 text-[11px] text-[#A6482F]">{{ errors.year }}</p>
            </div>
            <div>
              <label for="editor-issue" class="block text-[11px] text-[#8B5A2B]">期号</label>
              <input
                id="editor-issue"
                v-model.number="form.issue"
                type="number"
                min="1"
                max="999"
                class="mt-1.5 w-full border-b border-[#D8D0C4] bg-transparent pb-1.5 text-[14px] text-[#1A1A1A] outline-none transition-colors duration-300 focus:border-b-[#8B5A2B]"
                :class="errors.issue ? 'border-b-[#A6482F]' : ''"
              />
              <p v-if="errors.issue" class="mt-1 text-[11px] text-[#A6482F]">{{ errors.issue }}</p>
            </div>
          </div>

          <!-- 专栏 -->
          <div>
            <label for="editor-column" class="block text-[11px] text-[#8B5A2B]">专栏</label>
            <select
              id="editor-column"
              v-model="form.columnId"
              class="mt-1.5 w-full border-b border-[#D8D0C4] bg-transparent pb-1.5 text-[14px] text-[#1A1A1A] outline-none transition-colors duration-300 focus:border-b-[#8B5A2B]"
            >
              <option value="">不归入任何专栏</option>
              <option v-for="c in columns" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <!-- 标签 -->
          <div>
            <label for="editor-tags" class="block text-[11px] text-[#8B5A2B]">标签</label>
            <input
              id="editor-tags"
              v-model="form.tagsText"
              type="text"
              placeholder="用逗号分隔，最多 5 个"
              class="mt-1.5 w-full border-b border-[#D8D0C4] bg-transparent pb-1.5 text-[14px] text-[#1A1A1A] outline-none transition-colors duration-300 placeholder:text-[#B4AA9C] focus:border-b-[#8B5A2B]"
              :class="errors.tags ? 'border-b-[#A6482F]' : ''"
            />
            <p v-if="errors.tags" class="mt-1 text-[11px] text-[#A6482F]">{{ errors.tags }}</p>
            <div v-if="tagList.length" class="mt-2.5 flex flex-wrap gap-1.5">
              <span
                v-for="tag in tagList"
                :key="tag"
                class="rounded-full border border-[#E5E0D8] px-2.5 py-0.5 text-[11px] text-[#666666]"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- 封面 -->
          <div>
            <span class="block text-[11px] text-[#8B5A2B]">封面</span>

            <div v-if="form.cover" class="mt-2">
              <!-- 用上传返回的相对路径，走 Vite 代理 / Nginx 同源，不需要拼域名 -->
              <img :src="form.cover" alt="封面预览" class="w-full rounded-sm object-cover" style="aspect-ratio: 3 / 2" />
              <div class="mt-2 flex items-center justify-between">
                <label
                  for="editor-cover"
                  class="cursor-pointer text-[11px] text-[#8B5A2B] underline-offset-4 hover:underline"
                >
                  换一张
                </label>
                <button type="button" class="text-[11px] text-[#666666] hover:text-[#A6482F]" @click="removeCover">
                  移除
                </button>
              </div>
            </div>

            <label
              v-else
              for="editor-cover"
              class="mt-2 flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[#D8D0C4] bg-[#F3EFE7] text-[#B4AA9C] transition-colors duration-300 hover:border-[#8B5A2B] hover:text-[#8B5A2B]"
            >
              <ImagePlus v-if="!uploading" :size="20" />
              <Loader2 v-else :size="20" class="animate-spin" />
              <span class="text-[11px]">{{ uploading ? '上传中' : '选择图片' }}</span>
              <span class="text-[10px] text-[#C4BBAD]">jpg / png / webp，2MB 内</span>
            </label>

            <input
              id="editor-cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              @change="onPickCover"
            />

            <p v-if="coverError || errors.cover" class="mt-1.5 text-[11px] text-[#A6482F]">
              {{ coverError || errors.cover }}
            </p>
            <p class="mt-2 text-[10px] leading-relaxed text-[#B4AA9C]">没有封面时，列表里会显示成纯文字卡片。</p>
          </div>

          <!-- 统计 -->
          <div class="border-t border-[#E5E0D8] pt-4 text-[11px] text-[#8B5A2B]">
            <p>{{ charCount }} 字 · 约 {{ readTime }} 分钟阅读</p>
            <p v-if="dirty" class="mt-1 text-[#B4AA9C]">有未保存的修改</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 预览区的排版。刻意和文章详情页保持一致，避免"预览和发布后长得不一样" */
.md-preview :deep(h2) {
  margin: 2em 0 0.7em;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: #1a1a1a;
}

.md-preview :deep(h3) {
  margin: 1.7em 0 0.6em;
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
}

.md-preview :deep(p) {
  margin: 1.2em 0;
  font-size: 15px;
  line-height: 1.95;
  color: #333333;
}

.md-preview :deep(a) {
  color: #8b5a2b;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.md-preview :deep(strong) {
  font-weight: 600;
  color: #1a1a1a;
}

.md-preview :deep(ul),
.md-preview :deep(ol) {
  margin: 1.2em 0;
  padding-left: 1.4em;
  font-size: 15px;
  line-height: 1.95;
  color: #333333;
}

.md-preview :deep(li) {
  margin: 0.35em 0;
}

/**
 * ⚠️ Tailwind 的 preflight 会把所有 ul/ol 的 list-style 重置成 none。
 * 不显式写回来，预览里的列表就是一堆没有圆点的缩进文字 ——
 * 而详情页写了这两条，于是「预览」和「发布后」长得不一样。
 * 预览的唯一价值就是所见即所得，样式必须和 ArticlePage 对齐。
 */
.md-preview :deep(ul li) {
  list-style: disc;
}

.md-preview :deep(ol li) {
  list-style: decimal;
}

.md-preview :deep(blockquote) {
  margin: 1.6em 0;
  border-left: 2px solid #8b5a2b;
  padding-left: 1.2em;
  color: #666666;
  font-style: italic;
}

.md-preview :deep(code) {
  border-radius: 2px;
  background: #efe9df;
  padding: 0.15em 0.4em;
  font-size: 0.88em;
  color: #6b4420;
}

.md-preview :deep(pre) {
  margin: 1.6em 0;
  overflow-x: auto;
  border-radius: 2px;
  background: #26221e;
  padding: 1.1em 1.2em;
}

.md-preview :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #ece5da;
  font-size: 13px;
  line-height: 1.85;
}

.md-preview :deep(img) {
  margin: 1.6em 0;
  max-width: 100%;
}
</style>
