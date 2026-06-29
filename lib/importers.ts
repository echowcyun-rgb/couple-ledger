import * as XLSX from "@e965/xlsx"
import { matchCategoryByKeywords } from "./category-keywords"
import type { Category, ImportBatch, Member, Transaction, TxType } from "./types"

// ===== 导入结果类型 =====
export interface ImportResult {
  transactions: Transaction[]
  batch: Omit<ImportBatch, "time">
  unrecognized: number
}

function resolveCategoryFromCell(
  raw: string,
  cats: Category[]
): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const byKey = cats.find((c) => c.key === trimmed)
  const byLabel = cats.find((c) => c.label === trimmed)
  if (byLabel) return byLabel.key
  if (byKey) return byKey.key
  return ""
}

function suggestCategory(
  matchText: string,
  type: TxType,
  cats: Category[],
  explicitKey = ""
): string {
  if (explicitKey) return explicitKey
  return matchCategoryByKeywords(matchText, type, cats)
}

function makeBatch(
  transactions: Transaction[],
  source: ImportBatch["source"],
  recorder: string
): Omit<ImportBatch, "time"> {
  return {
    ids: transactions.map((t) => t.id),
    source,
    recorder,
    count: transactions.length,
  }
}

// ===== CSV 解析 =====

function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim())
      cur = ""
    } else {
      cur += ch
    }
  }
  cols.push(cur.trim())
  return cols
}

// ===== 支付宝账单解析 =====

/**
 * 支付宝 CSV 典型列名（中文）：
 * 交易时间, 交易分类, 交易对方, 商品说明, 收/支, 金额, 交易状态, 交易订单号, 商户订单号, 备注
 */
export function parseAlipayCSV(
  content: string,
  memberId: string,
  cats: Category[] = []
): ImportResult {
  const lines = content.split("\n").filter((l) => l.trim())
  const transactions: Transaction[] = []
  let unrecognized = 0
  let headerIdx = -1

  for (let i = 0; i < lines.length; i++) {
    if (
      headerIdx < 0 &&
      (lines[i].includes("交易时间") || lines[i].includes("收/支"))
    ) {
      headerIdx = i
      continue
    }
    if (headerIdx < 0) continue

    const cols = parseCSVLine(lines[i])
    if (cols.length < 6) {
      unrecognized++
      continue
    }

    const date = cols[0]?.slice(0, 10) || ""
    const typeLabel = cols[4]?.trim() || ""
    const amountStr = cols[5]?.trim() || ""
    const counterparty = cols[2]?.trim() || ""
    const desc = cols[3]?.trim() || ""
    const note = cols[9]?.trim() || ""
    const categoryLabel = cols[1]?.trim() || ""

    if (!date || !amountStr) {
      unrecognized++
      continue
    }

    const amount = Math.abs(parseFloat(amountStr.replace(/[^\d.-]/g, "")))
    if (!Number.isFinite(amount) || amount <= 0) {
      unrecognized++
      continue
    }

    const type: TxType =
      typeLabel === "收入" ? "in" : typeLabel === "支出" ? "out" : "out"

    const status = cols[6]?.trim() || ""
    if (status.includes("关闭") || status.includes("退款")) {
      unrecognized++
      continue
    }

    const matchText = [desc, note, counterparty].filter(Boolean).join(" ")
    const explicitKey = resolveCategoryFromCell(categoryLabel, cats)

    transactions.push({
      id: `tx_ali_${Date.now()}_${i}`,
      date,
      type,
      amount,
      categoryKey: suggestCategory(matchText, type, cats, explicitKey),
      memberId,
      note: desc || note || counterparty,
      createdAt: Date.now() + i,
    })
  }

  return {
    transactions,
    batch: makeBatch(transactions, "alipay", memberId),
    unrecognized,
  }
}

// ===== 微信账单解析 =====

/**
 * 微信 CSV 典型列名（中文）：
 * 交易时间, 交易类型, 交易对方, 商品说明, 收/支, 金额, 支付方式, 交易状态, 交易单号, 商户单号, 备注
 */
export function parseWechatCSV(
  content: string,
  memberId: string,
  cats: Category[] = []
): ImportResult {
  const lines = content.split("\n").filter((l) => l.trim())
  const transactions: Transaction[] = []
  let unrecognized = 0
  let headerIdx = -1

  for (let i = 0; i < lines.length; i++) {
    if (
      headerIdx < 0 &&
      (lines[i].includes("交易时间") || lines[i].includes("收/支"))
    ) {
      headerIdx = i
      continue
    }
    if (headerIdx < 0) continue

    const cols = parseCSVLine(lines[i])
    if (cols.length < 6) {
      unrecognized++
      continue
    }

    const date = cols[0]?.slice(0, 10) || ""
    const typeLabel = cols[4]?.trim() || ""
    const amountStr = cols[5]?.trim() || ""
    const counterparty = cols[2]?.trim() || ""
    const desc = cols[3]?.trim() || ""
    const note = cols[10]?.trim() || ""
    const typeName = cols[1]?.trim() || ""

    if (!date || !amountStr) {
      unrecognized++
      continue
    }

    const amount = Math.abs(parseFloat(amountStr.replace(/[^\d.-]/g, "")))
    if (!Number.isFinite(amount) || amount <= 0) {
      unrecognized++
      continue
    }

    const type: TxType =
      typeLabel === "收入" ? "in" : typeLabel === "支出" ? "out" : "out"

    const status = cols[7]?.trim() || ""
    if (status.includes("已关闭") || status.includes("已退款")) {
      unrecognized++
      continue
    }

    const matchText = [desc, note, counterparty, typeName].filter(Boolean).join(" ")
    const explicitKey = resolveCategoryFromCell(typeName, cats)

    transactions.push({
      id: `tx_wx_${Date.now()}_${i}`,
      date,
      type,
      amount,
      categoryKey: suggestCategory(matchText, type, cats, explicitKey),
      memberId,
      note: desc || note || counterparty,
      createdAt: Date.now() + i,
    })
  }

  return {
    transactions,
    batch: makeBatch(transactions, "wechat", memberId),
    unrecognized,
  }
}

// ===== 自动检测来源 =====

export function detectSource(
  content: string
): "alipay" | "wechat" | "unknown" {
  const firstFew = content.slice(0, 500)
  if (firstFew.includes("微信支付账单明细") || firstFew.includes("微信账单")) {
    return "wechat"
  }
  if (
    firstFew.includes("支付宝") &&
    (firstFew.includes("账单") || firstFew.includes("交易流水"))
  ) {
    return "alipay"
  }
  if (firstFew.includes("商品说明") && firstFew.includes("收/支")) {
    return firstFew.includes("交易分类") ? "alipay" : "wechat"
  }
  return "unknown"
}

// ===== 通用 xlsx/xls 导入 =====

const TYPE_MAP: Record<string, TxType> = {
  out: "out",
  in: "in",
  save: "save",
  支出: "out",
  收入: "in",
  存钱: "save",
  支: "out",
  收: "in",
  expenditure: "out",
  expense: "out",
  income: "in",
  saving: "save",
}

function getCell(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = row[key]
    if (val != null && val !== "") return val
  }
  const normMap = new Map(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
  )
  for (const key of keys) {
    const val = normMap.get(key.trim().toLowerCase())
    if (val != null && val !== "") return val
  }
  return undefined
}

function isHeaderLikeRow(row: Record<string, unknown>): boolean {
  const date = String(getCell(row, "date", "日期", "时间", "交易时间", "交易日期") ?? "").trim()
  const type = String(getCell(row, "type", "类型", "收支类型", "收/支", "收支") ?? "").trim()
  const amount = String(getCell(row, "amount", "金额", "数额", "交易金额", "金额(元)") ?? "").trim()
  return (
    (date === "日期" || date === "交易时间" || date === "date") &&
    (type === "类型" || type === "收/支" || type === "type") &&
    (amount === "金额" || amount === "金额(元)" || amount === "amount")
  )
}

function findHeaderRowIndex(sheet: XLSX.WorkSheet): number {
  const ref = sheet["!ref"]
  if (!ref) return 0
  const range = XLSX.utils.decode_range(ref)
  const maxRow = Math.min(range.e.r, range.s.r + 24)

  for (let r = range.s.r; r <= maxRow; r++) {
    const cells: string[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })]
      if (cell?.v != null && cell.v !== "") {
        cells.push(String(cell.v).trim())
      }
    }
    const joined = cells.join("|")
    const hasDate = /日期|交易时间|交易日期|date/i.test(joined)
    const hasAmount = /金额|数额|amount/i.test(joined)
    const hasType = /类型|收\/支|收支|type/i.test(joined)
    if (hasDate && hasAmount && hasType) return r
  }
  return range.s.r
}

function parseImportDate(raw: unknown): string {
  if (raw == null || raw === "") return ""
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10)
  }
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw)
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`
    }
  }
  const s = String(raw).trim()
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const parsed = XLSX.SSF.parse_date_code(Number(s))
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`
    }
  }
  const matched = s.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/)
  if (matched) {
    return `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}`
  }
  const isoLike = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoLike) {
    return `${isoLike[1]}-${isoLike[2].padStart(2, "0")}-${isoLike[3].padStart(2, "0")}`
  }
  return s.slice(0, 10)
}

function parseImportType(raw: unknown): TxType | "" {
  const s = String(raw ?? "").trim()
  if (!s) return ""
  if (TYPE_MAP[s]) return TYPE_MAP[s]
  if (TYPE_MAP[s.toLowerCase()]) return TYPE_MAP[s.toLowerCase()]!
  if (/支出|付款|消费/.test(s)) return "out"
  if (/收入|收款|转入/.test(s)) return "in"
  if (/存钱|储蓄/.test(s)) return "save"
  return ""
}

function parseImportAmount(raw: unknown): number {
  if (typeof raw === "number") return raw
  return parseFloat(String(raw).replace(/,/g, "").replace(/[¥￥]/g, "").trim())
}

export const GENERIC_BILL_IMPORT_HINT =
  "无法识别账单数据，请确保文件包含 日期/类型/金额 列（类型：支出/收入/存钱 或 out/in/save）"

function rowsToTransactions(
  rows: Record<string, unknown>[],
  members: Member[],
  cats: Category[],
  memberId: string
): Transaction[] {
  return rows
    .map((row, idx) => {
      if (isHeaderLikeRow(row)) return null

      const date = parseImportDate(
        getCell(row, "date", "日期", "时间", "交易时间", "交易日期", "记账日期")
      )
      const type = parseImportType(
        getCell(row, "type", "类型", "收支类型", "收/支", "收支")
      )
      const amount = parseImportAmount(
        getCell(row, "amount", "金额", "数额", "交易金额", "金额(元)", "金额（元）")
      )

      const rawCategory = String(
        getCell(row, "categoryKey", "分类", "category", "类别", "交易分类") ?? ""
      ).trim()
      const product = String(
        getCell(row, "商品说明", "说明", "商品", "摘要") ?? ""
      ).trim()
      const note = String(getCell(row, "note", "备注") ?? "").trim()
      const counterparty = String(
        getCell(row, "memberId", "成员", "member", "经手人", "交易对方") ?? ""
      ).trim()

      let resolvedMemberId = counterparty
      if (resolvedMemberId) {
        const matched = members.find((m) => m.id === resolvedMemberId || m.name === resolvedMemberId)
        resolvedMemberId = matched?.id || resolvedMemberId
      } else {
        resolvedMemberId = members[0]?.id || memberId
      }

      if (!date || !type || !Number.isFinite(amount) || amount <= 0) return null

      const explicitKey = resolveCategoryFromCell(rawCategory, cats)
      const matchText = [product, note, counterparty].filter(Boolean).join(" ")

      return {
        id: `tx_import_${Date.now()}_${idx}`,
        date,
        type,
        amount: Math.abs(amount),
        categoryKey: suggestCategory(matchText, type, cats, explicitKey),
        memberId: resolvedMemberId,
        note: note || product || counterparty,
        createdAt: Date.now() + idx,
      }
    })
    .filter(Boolean) as Transaction[]
}

function sheetRowsFromWorkbook(wb: XLSX.WorkBook): Record<string, unknown>[] {
  const sheetName = wb.SheetNames.includes("账单") ? "账单" : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const headerRow = findHeaderRowIndex(ws)
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: true,
    defval: "",
    range: headerRow,
  })
}

function buildGenericResult(
  transactions: Transaction[],
  memberId: string
): ImportResult {
  return {
    transactions,
    batch: makeBatch(transactions, "generic", memberId),
    unrecognized: 0,
  }
}

export function parseGenericCsv(
  content: string,
  members: Member[],
  cats: Category[] = [],
  memberId?: string
): ImportResult {
  const recorder = memberId || members[0]?.id || ""
  const text = content.replace(/^\uFEFF/, "")
  const wb = XLSX.read(text, { type: "string", cellDates: true })
  const transactions = rowsToTransactions(
    sheetRowsFromWorkbook(wb),
    members,
    cats,
    recorder
  )
  return buildGenericResult(transactions, recorder)
}

export function parseGenericXlsx(
  buffer: ArrayBuffer,
  members: Member[],
  cats: Category[] = [],
  memberId?: string
): ImportResult {
  const recorder = memberId || members[0]?.id || ""
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true })
  const transactions = rowsToTransactions(
    sheetRowsFromWorkbook(wb),
    members,
    cats,
    recorder
  )
  return buildGenericResult(transactions, recorder)
}
