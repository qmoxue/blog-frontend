<script setup lang="ts">
/**
 * 注册页
 * ------------------------------------------------------------
 * 和登录页的差别：
 *   1. 多两个字段：用户名、确认密码（确认密码是纯前端概念，后端没有）
 *   2. 多一个身份选择：读者 / 作者
 *   3. 成功后同样不跳转，交给 watch
 *
 * 身份选择为什么要有？
 *   后端有个开关 ALLOW_SELF_AUTHOR：
 *     打开 → 注册时可以自选作者，方便自己测试发文流程
 *     关闭 → 一律注册成读者，作者只能由管理员授予
 *   界面上如实写出这个规则，比"藏起来让用户猜"更可靠。
 *   而且最终结果以后端返回的 role 为准 —— 前端选了作者但被降级成读者，
 *   导航栏会立刻显示读者的样子，不会出现"界面说有权限、实际发不了文"的假象。
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-vue-next'
import AuthShell from '../components/auth/AuthShell.vue'
import AuthField from '../components/auth/AuthField.vue'
import { useAuth } from '../stores/auth'
import { safeRedirect } from '../router'
import {
  compactErrors,
  validateConfirmPassword,
  validateEmail,
  validateNewPassword,
  validateUsername,
  type FieldErrors,
} from '../utils/validators'
import { toSubmitFailure } from '../utils/formErrors'
import type { UserRole } from '../types'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const roleOptions: Array<{ value: UserRole; label: string; desc: string }> = [
  { value: 'reader', label: '读者', desc: '阅读、收藏' },
  { value: 'author', label: '作者', desc: '写作、发布' },
]

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirm: '',
  // 默认读者：这是最保守的选择，绝大多数人注册只是为了看
  role: 'reader' as UserRole,
})

const errors = ref<FieldErrors>({})
const submitError = ref('')
const submitting = ref(false)

const redirectTo = computed(() => safeRedirect(route.query.redirect))

// 已登录就不用注册了（理由同登录页）
watch(
  () => auth.state.user,
  (user) => {
    if (user) router.replace(redirectTo.value)
  },
  { immediate: true },
)

function clearError(field: string) {
  if (!errors.value[field]) return
  const next = { ...errors.value }
  delete next[field]
  errors.value = next
}

watch(() => form.username, () => clearError('username'))
watch(() => form.email, () => clearError('email'))
watch(() => form.password, () => clearError('password'))
// 改原密码时，「两次不一致」的提示可能已经不成立了，一起撤掉
watch(() => form.password, () => clearError('confirm'))
watch(() => form.confirm, () => clearError('confirm'))

async function onSubmit() {
  if (submitting.value) return

  submitError.value = ''

  const next = compactErrors({
    username: validateUsername(form.username),
    email: validateEmail(form.email),
    password: validateNewPassword(form.password),
    confirm: validateConfirmPassword(form.confirm, form.password),
  })
  errors.value = next
  if (Object.keys(next).length > 0) return

  submitting.value = true
  try {
    await auth.signUp({
      // 用户名保留原样（后端 trim），邮箱统一小写
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
    })
  } catch (err) {
    const failure = toSubmitFailure(err, ['username', 'email', 'password', 'role'])
    errors.value = failure.fields
    submitError.value = failure.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthShell
    eyebrow="账号 · Sign up"
    title="先注册，再决定写不写。"
    lead="一个账号就够了。读者能收藏和评论，作者能直接在这里写稿、上传封面、发布成稿。"
  >
    <h1 class="font-display text-[30px] leading-tight tracking-tight text-[#1A1A1A]">创建账号</h1>
    <p class="mt-3 text-[13.5px] leading-relaxed text-[#666666]">
      已经有账号了？
      <RouterLink
        to="/login"
        class="text-[#8B5A2B] underline decoration-[#8B5A2B]/30 decoration-1 underline-offset-4 transition-colors hover:decoration-[#8B5A2B]"
      >
        直接登录
      </RouterLink>
    </p>

    <div
      v-if="submitError"
      role="alert"
      class="mt-7 flex items-start gap-2.5 rounded-lg border border-[#A6482F]/25 bg-[#A6482F]/[0.055] px-4 py-3"
    >
      <AlertCircle :size="15" :stroke-width="1.7" class="mt-[2px] shrink-0 text-[#A6482F]" />
      <span class="text-[13px] leading-relaxed text-[#A6482F]">{{ submitError }}</span>
    </div>

    <form class="mt-9 space-y-7" novalidate @submit.prevent="onSubmit">
      <AuthField
        id="register-username"
        v-model="form.username"
        label="用户名"
        placeholder="会显示在文章作者栏"
        autocomplete="nickname"
        :error="errors.username"
        hint="2–20 个字符，支持中文、字母、数字、下划线"
      />

      <AuthField
        id="register-email"
        v-model="form.email"
        label="邮箱"
        type="email"
        placeholder="you@example.com"
        autocomplete="email"
        :error="errors.email"
      />

      <AuthField
        id="register-password"
        v-model="form.password"
        label="密码"
        type="password"
        placeholder="至少 6 位"
        autocomplete="new-password"
        :error="errors.password"
      />

      <AuthField
        id="register-confirm"
        v-model="form.confirm"
        label="确认密码"
        type="password"
        placeholder="再输入一次"
        autocomplete="new-password"
        :error="errors.confirm"
      />

      <!-- 身份：用真实的 radio + label，键盘和读屏软件都能正常操作 -->
      <fieldset class="border-0 p-0">
        <legend class="text-[11px] uppercase tracking-[0.18em] text-[#999999]">身份</legend>

        <div class="mt-2.5 grid grid-cols-2 gap-3">
          <label v-for="opt in roleOptions" :key="opt.value" class="cursor-pointer">
            <input
              v-model="form.role"
              type="radio"
              name="role"
              :value="opt.value"
              class="peer sr-only"
            />
            <span
              class="block rounded-lg border border-[#D8D0C4] px-4 py-3 transition-colors duration-300 peer-checked:border-[#8B5A2B] peer-checked:bg-[#8B5A2B]/[0.06] peer-focus-visible:ring-2 peer-focus-visible:ring-[#8B5A2B]/35"
            >
              <span class="block text-[13.5px] text-[#1A1A1A]">{{ opt.label }}</span>
              <span class="mt-0.5 block text-[11.5px] leading-relaxed text-[#999999]">
                {{ opt.desc }}
              </span>
            </span>
          </label>
        </div>

        <p v-if="errors.role" role="alert" class="mt-2 text-[12px] text-[#A6482F]">
          {{ errors.role }}
        </p>
        <p v-else class="mt-2 text-[12px] leading-relaxed text-[#999999]">
          演示模式下可以直接选作者。正式环境注册一律为读者，作者由管理员授予。
        </p>
      </fieldset>

      <button
        type="submit"
        :disabled="submitting"
        class="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1A1A1A] text-[14px] font-medium tracking-wide text-[#F8F5F0] transition-colors duration-300 hover:bg-[#8B5A2B] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-[#1A1A1A]"
      >
        <Loader2 v-if="submitting" :size="15" class="animate-spin" />
        <span>{{ submitting ? '正在创建' : '创建账号' }}</span>
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
