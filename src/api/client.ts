/**
 * 接口请求封装
 * ------------------------------------------------------------
 * 这一层只干一件事：把「HTTP + 业务错误码」收敛成一个统一的 Promise。
 *
 * 为什么要封装，不在页面里直接 fetch？
 *   后端所有响应都长这样：
 *     { code: 0, message: 'ok', data: {...} }       成功
 *     { code: 40301, message: '没有权限', data: null }  失败
 *   注意：**失败时 HTTP 状态码也可能是 200 以外的值，但业务失败不一定是 4xx/5xx**。
 *   如果每个页面自己写 fetch，就要在几十个地方重复判断 code、重复拼错误提示。
 *   封装一次，页面里只需要 try/catch。
 */

/** 后端统一响应外壳 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

/** 分页信息 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

/** 分页数据的形状 */
export interface Paginated<T> {
  list: T[]
  pagination: Pagination
}

/**
 * 业务异常
 * code 用的是后端定义的业务错误码（40001 / 40301 ...），不是 HTTP 状态码。
 * 页面可以据此做不同处理，比如 40101 → 跳登录页。
 */
export class ApiError extends Error {
  code: number
  status: number
  /**
   * 字段级错误，形如 { username: '用户名至少 2 个字符' }
   * ------------------------------------------------------------
   * 后端 zod 校验失败时返回的是：
   *   { code: 40001, message: '请求参数校验失败', data: { details: { 字段: 提示 } } }
   * 有了这个字段，注册表单就能把错误直接标在对应输入框下面，
   * 而不是只在顶部弹一句"请求参数校验失败"让用户自己猜。
   * 没有字段级信息时是 null。
   */
  details: Record<string, string> | null

  constructor(code: number, message: string, status = 0, details: Record<string, string> | null = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

/**
 * 接口前缀：相对路径，**不要写 http://localhost:3000**
 * ------------------------------------------------------------
 * 开发时 Vite 代理转发（见 vite.config.ts），生产时 Nginx 反代。
 * 两边都不用改代码。
 * 如果写成完整地址，浏览器就会认为是跨域请求，cookie 带不过去，
 * 登录态永远建立不起来 —— 这是前后端对接最常见的第一个坑。
 */
const BASE = '/api/v1'

/** 超时时间：后端没启动时不要一直转圈，8 秒后直接走降级 */
const TIMEOUT = 8000

/**
 * 发一个请求
 * @param path 以 / 开头的路径，如 '/articles?page=1'
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT)

  const headers = new Headers(init.headers)
  // 只有带 body 时才声明 JSON，GET 请求加这个头会让预检变复杂
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(BASE + path, {
      // 关键：带上 cookie。后端 token 存在 httpOnly cookie 里，
      // 不加这一行，登录后的请求全都是 401
      credentials: 'include',
      ...init,
      headers,
      signal: controller.signal,
    })
  } catch (err) {
    // 网络层失败：后端没起、断网、超时
    const aborted = err instanceof DOMException && err.name === 'AbortError'
    throw new ApiError(
      -1,
      aborted ? '请求超时，请检查后端服务是否启动' : '网络连接失败，请检查后端服务是否启动',
    )
  } finally {
    window.clearTimeout(timer)
  }

  // 后端可能返回非 JSON（比如 Nginx 的 502 页面），这里不能假设一定是 JSON
  let body: ApiEnvelope<T> | null = null
  try {
    body = (await res.json()) as ApiEnvelope<T>
  } catch {
    body = null
  }

  // 业务成功必须同时满足：HTTP 2xx + code === 0
  if (!res.ok || !body || body.code !== 0) {
    /**
     * 5xx 且没有 JSON body = 根本没打到我们的后端
     * ------------------------------------------------------------
     * 后端没启动时，响应不是「连接失败」，而是中间层的错误页：
     *   开发环境 Vite 代理 → 500（HTML 错误页）
     *   生产环境 Nginx    → 502 / 504
     * 这两种响应都不是我们的 JSON 格式，body 为 null。
     *
     * 如果直接把状态码抛出去，界面上会显示「请求失败（HTTP 500）」——
     * 用户看不懂，还会以为是网站有 bug。
     * 所以这里统一翻译成一句人话，并且用 code -1（网络层失败），
     * 让上层按「服务不可用」处理，而不是当成业务错误。
     */
    if (!body && res.status >= 500) {
      throw new ApiError(-1, '服务暂时不可用，请确认后端已启动后重试', res.status)
    }

    // 失败时 data 的形状是 { details } 或 null，和成功时的 T 不是一回事，
    // 所以这里不能用 body.data 的类型，必须当成 unknown 收窄
    const failureData = (body?.data ?? null) as { details?: Record<string, string> } | null

    throw new ApiError(
      body?.code ?? -1,
      body?.message ?? `请求失败（HTTP ${res.status}）`,
      res.status,
      failureData?.details ?? null,
    )
  }

  return body.data
}
