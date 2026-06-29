/** 云同步默认超时（底层与 UI 层共用） */
export const CLOUD_TIMEOUT_MS = 10_000

export interface PostgrestLikeError {
  code: string
  message: string
  details?: string
  hint?: string
}

export function isPostgrestError(e: unknown): e is PostgrestLikeError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as PostgrestLikeError).code === "string" &&
    "message" in e &&
    typeof (e as PostgrestLikeError).message === "string"
  )
}

/**
 * PostgREST / PostgreSQL 可重试错误码白名单
 * - 08xxx：连接类
 * - 40001 / 40P01：事务冲突 / 死锁
 * - 53300 / 57P03：连接数 / 暂不可连接
 * - PGRST000 / PGRST502-504：网关或 PostgREST 内部错误
 */
export const RETRYABLE_POSTGREST_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "40001",
  "40P01",
  "53300",
  "57P03",
  "57P04",
  "58P01",
  "PGRST000",
  "PGRST502",
  "PGRST503",
  "PGRST504",
])

/** PGRST1xx–PGRST4xx 为客户端 / 业务错误，不重试 */
const NON_RETRYABLE_PGRST_PREFIXES = ["PGRST1", "PGRST2", "PGRST3", "PGRST4"] as const

function isNetworkOrTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  const m = e.message.toLowerCase()
  return (
    m.includes("fetch failed") ||
    m.includes("network") ||
    m.includes("云同步超时") ||
    m.includes("timeout") ||
    m.includes("econnreset") ||
    m.includes("enotfound") ||
    m.includes("socket") ||
    m.includes("aborterror")
  )
}

/** 判断是否应对云同步操作进行重试 */
export function isRetryableError(e: unknown): boolean {
  if (isNetworkOrTimeoutError(e)) return true

  if (isPostgrestError(e)) {
    const { code, message } = e
    if (RETRYABLE_POSTGREST_CODES.has(code)) return true
    if (NON_RETRYABLE_PGRST_PREFIXES.some((p) => code.startsWith(p))) return false
    // 完整性约束、RLS、权限等业务错误
    if (/^(23|42|42501|PGRST116)/.test(code)) return false
    // 响应体或 message 中的 5xx
    if (/\b5\d{2}\b/.test(message)) return true
    return false
  }

  return false
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = CLOUD_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("云同步超时")), ms)
    }),
  ])
}

export interface WithRetryOptions {
  retries?: number
  baseDelay?: number
}

/**
 * 指数退避重试；仅对 isRetryableError 为 true 的错误重试
 * 手动验证重试：临时把 NEXT_PUBLIC_SUPABASE_URL 改为无效值，编辑触发 push，控制台应看到 2 次重试后报错
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions = {}
): Promise<T> {
  const { retries = 2, baseDelay = 500 } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (attempt >= retries || !isRetryableError(e)) throw e
      const jitter = Math.random() * 100
      const delay = baseDelay * 2 ** attempt + jitter
      await sleep(delay)
    }
  }

  throw lastError
}
