<script setup lang="ts">
/**
 * 表单输入框
 * ------------------------------------------------------------
 * 为什么单独抽一个组件？
 *   登录 2 个字段 + 注册 4 个字段，每个字段都要：
 *   标签、下划线、错误文案、错误状态的红线、无障碍属性（aria-invalid / aria-describedby）、
 *   密码的显示切换。
 *   抄 6 遍必然有一遍写漏 —— 漏的通常是 aria，肉眼看不出来，
 *   但用读屏软件的人会直接卡住。
 *
 * 视觉上用「下划线」而不是「方框」：
 *   方框输入框是 Web 表单的默认长相，跟这套纸感排版不搭。
 *   下划线更像印刷品里的填空线，也和文章正文的分隔线是同一个语言。
 */
import { computed, ref } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    /** 必须显式传：label 的 for 和 input 的 id 靠它关联，读屏软件靠这个知道标签属于谁 */
    id: string
    label: string
    modelValue: string
    type?: 'text' | 'email' | 'password'
    /** 有值就显示错误并把下划线变红 */
    error?: string
    placeholder?: string
    /** 浏览器自动填充提示，如 'email' / 'current-password' / 'new-password' */
    autocomplete?: string
    /** 没有错误时显示的辅助说明 */
    hint?: string
  }>(),
  {
    type: 'text',
    error: '',
    placeholder: '',
    autocomplete: 'off',
    hint: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 密码是否明文显示 */
const revealed = ref(false)

const inputType = computed(() => (props.type === 'password' && revealed.value ? 'text' : props.type))

/**
 * aria-describedby 指向哪些元素
 * 读屏软件在聚焦输入框时会把这里列出的文本念出来，
 * 所以错误和提示不能只是"视觉上在下面"，必须建立这层关联
 */
const describedBy = computed(() => {
  const ids: string[] = []
  if (props.hint) ids.push(`${props.id}-hint`)
  if (props.error) ids.push(`${props.id}-error`)
  return ids.length > 0 ? ids.join(' ') : undefined
})

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div>
    <label :for="id" class="block text-[11px] uppercase tracking-[0.18em] text-[#999999]">
      {{ label }}
    </label>

    <div class="relative">
      <input
        :id="id"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="mt-2 w-full appearance-none border-b bg-transparent pb-2.5 text-[15px] text-[#1A1A1A] outline-none transition-colors duration-300 placeholder:text-[#C4BBAE] focus:outline-none focus:ring-0"
        :class="[
          error ? 'border-b-[#A6482F]' : 'border-b-[#D8D0C4] focus:border-b-[#8B5A2B]',
          type === 'password' ? 'pr-9' : '',
        ]"
        @input="onInput"
      />

      <!-- 密码显示切换：只有密码框才需要 -->
      <button
        v-if="type === 'password'"
        type="button"
        :aria-label="revealed ? '隐藏密码' : '显示密码'"
        :aria-pressed="revealed"
        class="absolute bottom-2.5 right-0 flex h-6 w-6 items-center justify-center rounded-full text-[#B4AA9C] transition-colors duration-300 hover:text-[#8B5A2B]"
        @click="revealed = !revealed"
      >
        <component :is="revealed ? EyeOff : Eye" :size="15" :stroke-width="1.5" />
      </button>
    </div>

    <p v-if="error" :id="`${id}-error`" role="alert" class="mt-2 text-[12px] leading-relaxed text-[#A6482F]">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" class="mt-2 text-[12px] leading-relaxed text-[#999999]">
      {{ hint }}
    </p>
  </div>
</template>
