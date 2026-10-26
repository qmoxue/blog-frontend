import type { Directive } from 'vue'

export interface RevealOptions {
  /** 入场延迟（毫秒），用于错落入场 */
  delay?: number
  /** 触发阈值 */
  threshold?: number
}

const registry = new WeakMap<Element, IntersectionObserver>()

/**
 * v-reveal：进入视口时淡入上移 12px。
 * 只改动 opacity / transform，不触发重排。
 */
export const vReveal: Directive<HTMLElement, RevealOptions | number | undefined> = {
  mounted(el, binding) {
    const options: RevealOptions =
      typeof binding.value === 'number' ? { delay: binding.value } : (binding.value ?? {})

    el.classList.add('reveal')
    if (options.delay) el.style.transitionDelay = `${options.delay}ms`

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      el.classList.add('is-in')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          el.classList.add('is-in')
          observer.disconnect()
          registry.delete(el)
        }
      },
      { threshold: options.threshold ?? 0.08, rootMargin: '0px 0px -48px 0px' },
    )

    observer.observe(el)
    registry.set(el, observer)
  },
  unmounted(el) {
    registry.get(el)?.disconnect()
    registry.delete(el)
  },
}
