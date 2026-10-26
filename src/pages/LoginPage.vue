<script setup lang="ts">
/**
 * 登录页
 * ------------------------------------------------------------
 * 几个刻意的设计决定：
 *
 * 1) 登录成功后**不在这里跳转**
 *    页面只负责"把用户交出去"（调 signIn），跳转由下面的 watch 统一处理。
 *    为什么？因为"已登录就该离开这个页面"是一条通用规则，
 *    而不是"点击登录按钮"的副作用。
 *    写在一起会出现两条跳转路径：提交成功跳一次、状态变化又跳一次，
 *    结果是同一个地址 push 两遍（偶发导航告警，很难查）。
 *
 * 2) 提交前先在本地校验一遍
 *    不是为了安全（后端才是权威），是为了省一次往返：
 *    邮箱格式不对没必要让用户等 300ms 再看到红字。
 *
 * 3) 错误分两层显示
 *    字段错误标在输入框下，整体错误（密码错、服务挂了）标在表单顶部。
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-vue-next'
import AuthShell from '../components/auth/AuthShell.vue'
import AuthField from '../components/auth/AuthField.vue'
import { useAuth } from '../stores/auth'
import { safeRedirect } from '../router'
import { compactErrors, validateEmail, validateLoginPassword, type FieldErrors } from '../utils/validators'
import { toSubmitFailure } from '../utils/formErrors'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const form = reactive({
  email: '',
  password: '',
})

const errors = ref<FieldErrors>({})
const submitError = ref('')
const submitting = ref(false)

/** 登录成功后要回到哪。经过安全过滤，外部地址会被换成首页 */
const redirectTo = computed(() => safeRedirect(route.query.redirect))

/**
 * 已经是登录状态？那就没必要待在这一页
 * ------------------------------------------------------------
 * immediate: true 是必需的：
 *   从首页点「登录」进来时，登录态早就探测好了，watch 不 immediate 就永远不触发。
 *   而如果是直接刷新到 /login，探测可能还在路上，
 *   这时候 user 从 null 变成对象，watch 会再触发一次 —— 两种情况都覆盖到了。
 */
watch(
  () => auth.state.user,
  (user) => {
    if (user) router.replace(redirectTo.value)
  },
  { immediate: true },
)

/** 用户开始改某个字段，就把那个字段的红字撤掉（别让人一边改一边被红字盯着） */
function clearError(field: keyof typeof form) {
  if (!errors.value[field]) return
  const next = { ...errors.value }
  delete next[field]
  errors.value = next
}

watch(() => form.email, () => clearError('email'))
watch(() => form.password, () => clearError('password'))

async function onSubmit() {
  // 防重复提交：网络慢的时候用户会连点
  if (submitting.value) return

  submitError.value = ''

  const next = compactErrors({
    email: validateEmail(form.email),
    password: validateLoginPassword(form.password),
  })
  errors.value = next
  if (Object.keys(next).length > 0) return

  submitting.value = true
  try {
    // 邮箱统一小写再发：后端也是这么存的，
    // 否则用户输入 "A@x.com" 会匹配不到注册时的 "a@x.com"
    await auth.signIn(form.email.trim().toLowerCase(), form.password)
    // 这里不跳转，交给上面的 watch
  } catch (err) {
    const failure = toSubmitFailure(err, ['email', 'password'])
    errors.value = failure.fields
    submitError.value = failure.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell
    eyebrow="账号 · Sign in"
    title="把技术写成能读完的文章。"
    lead="登录后可以评论、收藏文章。作者身份还能直接在这里写作、上传封面、发布成稿。"
  >
    <h1 class="font-display text-[30px] leading-tight tracking-tight text-[#1A1A1A]">欢迎回来</h1>
    <p class="mt-3 text-[13.5px] leading-relaxed text-[#666666]">
      还没有账号？
      <RouterLink
        to="/register"
        class="text-[#8B5A2B] underline decoration-[#8B5A2B]/30 decoration-1 underline-offset-4 transition-colors hover:decoration-[#8B5A2B]"
      >
        注册一个
      </RouterLink>
    </p>

    <!-- 整体错误：只在这个位置显示一次，不在字段上重复 -->
    <div
      v-if="submitError"
      role="alert"
      class="mt-7 flex items-start gap-2.5 rounded-lg border border-[#A6482F]/25 bg-[#A6482F]/[0.055] px-4 py-3"
    >
      <AlertCircle :size="15" :stroke-width="1.7" class="mt-[2px] shrink-0 text-[#A6482F]" />
      <span class="text-[13px] leading-relaxed text-[#A6482F]">{{ submitError }}</span>
    </div>

    <!-- novalidate：关掉浏览器自带的英文气泡提示，用我们自己的中文校验 -->
    <form class="mt-9 space-y-7" novalidate @submit.prevent="onSubmit">
      <AuthField
        id="login-email"
        v-model="form.email"
        label="邮箱"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        :error="errors.email"
      />

      <AuthField
        id="login-password"
        v-model="form.password"
        label="密码"
        type="password"
        placeholder="••••••••"
        autocomplete="current-password"
        :error="errors.password"
      />

      <button
        type="submit"
        :disabled="submitting"
        class="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] text-[14px] font-medium tracking-wide text-[#F8F5F0] transition-colors duration-300 hover:bg-[#8B5A2B] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-[#1A1A1A]"
      >
        <Loader2 v-if="submitting" :size="15" class="animate-spin" />
        <span>{{ submitting ? '正在登录' : '登录' }}</span>
        <ArrowRight
          v-if="!submitting"
          :size="15"
          :stroke-width="1.8"
          class="transition-transform duration-300 group-hover:translate-x-0.5"
        />
      </button>
    </form>

    <RouterLink
      to="/"
      class="mt-10 inline-block text-[12.5px] text-[#999999] transition-colors duration-300 hover:text-[#8B5A2B]"
    >
      ← 先随便看看
    </RouterLink>
  </AuthShell>
</template>
