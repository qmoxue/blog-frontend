<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-vue-next'
import { getArticleDetail, deleteArticle } from '../api/articles'
import { renderMarkdown } from '../utils/markdown'
import { useAuth } from '../stores/auth'
import type { Article } from '../types'

const props = defineProps<{ id: string }>()

type Detail = Article & { content: string }

const article = ref<Detail | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const coverFailed = ref(false)
const avatarFailed = ref(false)

// 管理操作相关
const { state: authState } = useAuth()
const router = useRouter()
const deleting = ref(false)
/**
 * 删除失败时单独显示的错误，不污染顶层的 errorMessage
 * （errorMessage 只在「还没加载出文章」的错误态里渲染，
 *  文章已经显示了再设它不会出现在界面上）。
 */
const deleteError = ref('')

/**
 * 当前登录用户是不是这篇文章的作者
 * ------------------------------------------------------------
 * 软判断：只决定编辑 / 删除按钮显不显示。
 * 真正的权限拦截在后端（requireRole('author') + 比对 author 字段），
 * 这里漏判顶多是按钮不显示，不会越权。
 */
const isAuthor = computed(() => {
  const me = authState.user
  return !!me && !!article.value && article.value.author.id === me.id
})

/**
 * 删除文章：二次确认 → 调接口 → 成功后回首页
 * ------------------------------------------------------------
 * 用 window.confirm 而不是自己写弹窗，原因：
 *   1. 删除是破坏性操作，浏览器原生确认框能拦住误触；
 *   2. 这个页面是「阅读页」，为两个按钮专门引入一套弹窗组件不划算，
 *      等全站都需要的模态框时再统一抽。
 * 失败不跳转，把错误显示在按钮旁边，让用户能重试。
 */
async function handleDelete() {
  if (!article.value || deleting.value) return

  const ok = window.confirm('确定要删除这篇文章吗？此操作不可恢复。')
  if (!ok) return

  deleting.value = true
  deleteError.value = ''
  try {
    await deleteArticle(article.value.id)
    // 删完回首页；用 replace 避免用户点返回又回到一篇已删除的文章
    router.replace('/')
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : '删除失败，请重试'
    deleting.value = false
  }
}

/**
 * 渲染后的正文 HTML
 * ⚠️ 这里拿到的是**已清洗**的 HTML（见 utils/markdown.ts），
 *   才能交给 v-html。直接 v-html 渲染 md.render() 的结果就是存储型 XSS。
 */
const html = computed(() => (article.value ? renderMarkdown(article.value.content) : ''))

/**
 * 正文里的段落数，用来提示阅读进度（也可以以后做目录）
 * 简单起见先不做目录，留个位置
 */

async function load(id: string) {
  loading.value = true
  errorMessage.value = ''
  article.value = null
  coverFailed.value = false
  avatarFailed.value = false

  try {
    article.value = await getArticleDetail(id)
    document.title = `${article.value.title} · 技刊 TechMag`
  } catch (err) {
    // 404 和网络失败要给不同的提示，否则用户不知道该刷新还是该返回
    errorMessage.value =
      err instanceof Error && err.message.includes('不存在')
        ? '这篇文章不存在，可能已经被删除了。'
        : '文章加载失败，请检查后端服务是否启动。'
    document.title = '文章加载失败 · 技刊 TechMag'
  } finally {
    loading.value = false
  }
}

// 用 watch 而不是 onMounted：
// 从一篇文章直接跳到另一篇时，组件会被复用，onMounted 不会再次执行
watch(
  () => props.id,
  (id) => load(id),
  { immediate: true },
)
</script>

<template>
  <article class="relative z-10 mx-auto max-w-[760px] px-5 pt-28 sm:px-8">
    <!-- 返回 -->
    <RouterLink
      to="/"
      class="group inline-flex items-center gap-2 text-[13px] text-[#666666] transition-colors duration-300 hover:text-[#8B5A2B]"
    >
      <ArrowLeft
        :size="15"
        :stroke-width="1.6"
        class="transition-transform duration-300 group-hover:-translate-x-0.5"
      />
      返回首页
    </RouterLink>

    <!-- 加载中 -->
    <div v-if="loading" class="mt-12 animate-pulse">
      <div class="h-3 w-24 rounded bg-[#EDE7DC]" />
      <div class="mt-6 h-10 w-4/5 rounded bg-[#EDE7DC]" />
      <div class="mt-3 h-10 w-3/5 rounded bg-[#EDE7DC]" />
      <div class="mt-10 h-64 w-full rounded-lg bg-[#EDE7DC]" />
      <div class="mt-10 space-y-3">
        <div class="h-3 w-full rounded bg-[#EDE7DC]" />
        <div class="h-3 w-full rounded bg-[#EDE7DC]" />
        <div class="h-3 w-2/3 rounded bg-[#EDE7DC]" />
      </div>
    </div>

    <!-- 出错 -->
    <div v-else-if="errorMessage" class="mt-24 text-center">
      <p class="font-display text-[26px] text-[#1A1A1A]">没有找到这一页</p>
      <p class="mt-4 text-[14px] leading-relaxed text-[#666666]">{{ errorMessage }}</p>
      <RouterLink
        to="/"
        class="mt-10 inline-flex items-center gap-2 rounded-full border border-[#E5E0D8] px-5 py-2.5 text-[13.5px] text-[#1A1A1A] transition-colors duration-300 hover:border-[#8B5A2B] hover:text-[#8B5A2B]"
      >
        回到首页
      </RouterLink>
    </div>

    <!-- 正文 -->
    <template v-else-if="article">
      <header class="mt-10">
        <div class="flex items-center gap-3">
          <span class="text-[10px] uppercase tracking-[0.22em] text-[#8B5A2B]">
            {{ article.category }}
          </span>
          <span class="h-px w-6 bg-[#E5E0D8]" />
          <span class="text-[12px] text-[#999999]">{{ article.date }}</span>
          <span class="text-[12px] text-[#999999]">· {{ article.readTime }}</span>
        </div>

        <h1
          class="mt-6 text-balance font-display text-[32px] leading-[1.3] text-[#1A1A1A] sm:text-[42px] sm:leading-[1.25]"
        >
          {{ article.title }}
        </h1>

        <p
          v-if="article.excerpt"
          class="mt-6 border-l-2 border-[#E5E0D8] pl-5 text-[15px] leading-[1.9] text-[#666666]"
        >
          {{ article.excerpt }}
        </p>

        <!-- 作者 -->
        <div class="mt-8 flex items-center gap-3 border-y border-[#E5E0D8] py-5">
          <img
            v-if="article.author.avatar && !avatarFailed"
            :src="article.author.avatar"
            :alt="article.author.name"
            referrerpolicy="no-referrer"
            class="h-9 w-9 rounded-full object-cover"
            @error="avatarFailed = true"
          />
          <span
            v-else
            class="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFE9DF] text-[13px] text-[#8B5A2B]"
          >
            {{ article.author.name.slice(0, 1) }}
          </span>
          <div class="leading-tight">
            <p class="text-[13.5px] text-[#1A1A1A]">{{ article.author.name }}</p>
            <p class="mt-1 text-[12px] text-[#999999]">{{ article.author.role }}</p>
          </div>
        </div>

        <!-- 管理入口：仅作者本人可见 -->
        <div v-if="isAuthor" class="mt-5 flex flex-wrap items-center gap-4">
          <RouterLink
            :to="`/editor/${article.id}`"
            class="group inline-flex items-center gap-1.5 text-[13px] text-[#8B5A2B] transition-colors duration-300 hover:text-[#6B4420]"
          >
            <Pencil :size="14" :stroke-width="1.6" />
            编辑文章
          </RouterLink>
          <button
            type="button"
            :disabled="deleting"
            class="inline-flex items-center gap-1.5 text-[13px] text-[#A6443B] transition-colors duration-300 hover:text-[#7E2F28] disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleDelete"
          >
            <Trash2 :size="14" :stroke-width="1.6" />
            {{ deleting ? '删除中…' : '删除文章' }}
          </button>
          <span v-if="deleteError" class="text-[12.5px] text-[#A6443B]">{{ deleteError }}</span>
        </div>
      </header>

      <!-- 封面 -->
      <figure v-if="article.cover && !coverFailed" class="mt-10">
        <img
          :src="article.cover"
          :alt="article.title"
          referrerpolicy="no-referrer"
          decoding="async"
          class="w-full rounded-lg object-cover"
          @error="coverFailed = true"
        />
      </figure>

      <!--
        正文
        v-html 只接受已清洗的 HTML（html 这个 computed 来自 renderMarkdown）
        不要改成直接渲染 article.content
      -->
      <div class="article-body mt-12" v-html="html" />

      <footer class="mt-16 border-t border-[#E5E0D8] pt-8">
        <RouterLink
          to="/"
          class="group inline-flex items-center gap-2 text-[13.5px] text-[#8B5A2B] transition-colors duration-300 hover:text-[#6B4420]"
        >
          <ArrowLeft
            :size="15"
            :stroke-width="1.6"
            class="transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          返回首页，继续阅读
        </RouterLink>
      </footer>
    </template>
  </article>
</template>

<style scoped>
/**
 * 正文排版
 * ------------------------------------------------------------
 * 为什么不用 @tailwindcss/typography（prose 类）？
 *   它自带的字号、行高、颜色和这个页面的色板冲突，覆盖起来比手写还长。
 *   而且杂志正文有几个特殊要求（首字下沉、中文行高 1.95），手写更直接。
 */
.article-body {
  font-size: 16px;
  line-height: 1.95;
  color: #2e2e2e;
  letter-spacing: 0.01em;
}

/* 中文正文的舒适行宽约 34–40 字，760px 容器已经接近上限 */
.article-body :deep(p) {
  margin: 0 0 1.5em;
}

/* 首字下沉：和刊头、精选区的处理保持一致 */
.article-body :deep(> p:first-of-type::first-letter) {
  float: left;
  font-family: 'Gilda Display', 'Songti SC', 'STSong', serif;
  font-size: 3.1em;
  line-height: 0.88;
  padding: 0.06em 0.12em 0 0;
  color: #1a1a1a;
}

.article-body :deep(h2) {
  margin: 2.6em 0 0.9em;
  font-family: 'Gilda Display', 'Songti SC', 'STSong', serif;
  font-size: 25px;
  line-height: 1.4;
  font-weight: 400;
  color: #1a1a1a;
}

.article-body :deep(h3) {
  margin: 2.2em 0 0.7em;
  font-family: 'Gilda Display', 'Songti SC', 'STSong', serif;
  font-size: 19px;
  line-height: 1.5;
  font-weight: 400;
  color: #1a1a1a;
}

.article-body :deep(a) {
  color: #8b5a2b;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
}

.article-body :deep(strong) {
  font-weight: 500;
  color: #1a1a1a;
}

.article-body :deep(blockquote) {
  margin: 2em 0;
  padding: 0.2em 0 0.2em 1.4em;
  border-left: 2px solid rgba(139, 90, 43, 0.35);
  color: #555555;
  font-style: normal;
}

.article-body :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 0 0 1.5em;
  padding-left: 1.4em;
}

.article-body :deep(li) {
  margin-bottom: 0.5em;
}

.article-body :deep(ul li) {
  list-style: disc;
}

.article-body :deep(ol li) {
  list-style: decimal;
}

.article-body :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: #f2ede4;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86em;
  color: #6b4420;
}

.article-body :deep(pre) {
  margin: 2em 0;
  padding: 1.2em 1.4em;
  overflow-x: auto;
  border-radius: 8px;
  background: #f2ede4;
  line-height: 1.75;
}

.article-body :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: 13px;
  color: #3a3a3a;
}

.article-body :deep(hr) {
  margin: 3em 0;
  border: 0;
  border-top: 1px solid #e5e0d8;
}

.article-body :deep(img) {
  margin: 2em 0;
  width: 100%;
  border-radius: 8px;
}

.article-body :deep(table) {
  width: 100%;
  margin: 2em 0;
  border-collapse: collapse;
  font-size: 14px;
}

.article-body :deep(th),
.article-body :deep(td) {
  padding: 0.6em 0.8em;
  border-bottom: 1px solid #e5e0d8;
  text-align: left;
}

.article-body :deep(th) {
  font-weight: 500;
  color: #1a1a1a;
}
</style>
