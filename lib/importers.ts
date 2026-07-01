import { matchCategoryByKeywords } from "./category-keywords"
import { loadXlsx } from "./xlsx"
import type { WorkBook, WorkSheet } from "@e965/xlsx"
import type { Category, ImportBatch, Member, Transaction, TxType } from "./types"

type XlsxModule = Awaited<ReturnType<typeof loadXlsx>>

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

/** 备注截取商品说明前 5 字 */
export function noteFromDesc(desc: string): string {
  return desc ? desc.slice(0, 5) : ""
}

function splitBillLines(content: string): string[] {
  return content.split("\n").filter((l) => l.trim())
}

function findCsvHeader(
  lines: string[],
  validate?: (cols: string[]) => boolean
): { headerIdx: number; colIndex: Map<string, number> } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes("交易时间") || !line.includes("收/支")) continue
    const cols = parseCSVLine(line).map((c) => c.trim())
    if (validate && !validate(cols)) continue
    const colIndex = new Map<string, number>()
    cols.forEach((name, idx) => {
      if (name) colIndex.set(name, idx)
    })
    return { headerIdx: i, colIndex }
  }
  return null
}

function pickCol(row: string[], colIndex: Map<string, number>, ...names: string[]): string {
  for (const name of names) {
    const idx = colIndex.get(name)
    if (idx != null && row[idx] != null) return String(row[idx]).trim()
  }
  return ""
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
  const lines = splitBillLines(content)
  const transactions: Transaction[] = []
  let unrecognized = 0

  const header = findCsvHeader(lines, (cols) =>
    cols.some((c) => c === "交易分类" || c === "商品说明")
  )
  if (!header) {
    return {
      transactions: [],
      batch: makeBatch([], "alipay", memberId),
      unrecognized: lines.length,
    }
  }

  for (let i = header.headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 6) {
      unrecognized++
      continue
    }

    const date = pickCol(cols, header.colIndex, "交易时间").slice(0, 10)
    const typeLabel = pickCol(cols, header.colIndex, "收/支")
    const amountStr = pickCol(cols, header.colIndex, "金额")
    const counterparty = pickCol(cols, header.colIndex, "交易对方")
    const desc = pickCol(cols, header.colIndex, "商品说明")
    const remark = pickCol(cols, header.colIndex, "备注")
    const categoryLabel = pickCol(cols, header.colIndex, "交易分类")

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

    const status = pickCol(cols, header.colIndex, "交易状态")
    if (status.includes("关闭") || status.includes("退款")) {
      unrecognized++
      continue
    }

    const matchText = [desc, remark, counterparty].filter(Boolean).join(" ")
    const explicitKey = resolveCategoryFromCell(categoryLabel, cats)

    transactions.push({
      id: `tx_ali_${Date.now()}_${i}`,
      date,
      type,
      amount,
      categoryKey: suggestCategory(matchText, type, cats, explicitKey),
      memberId,
      note: noteFromDesc(desc),
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
  const lines = splitBillLines(content)
  const transactions: Transaction[] = []
  let unrecognized = 0

  const header = findCsvHeader(lines, (cols) =>
    cols.some((c) => c === "交易类型" || c === "商品" || c === "商品说明")
  )
  if (!header) {
    return {
      transactions: [],
      batch: makeBatch([], "wechat", memberId),
      unrecognized: lines.length,
    }
  }

  for (let i = header.headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 6) {
      unrecognized++
      continue
    }

    const date = pickCol(cols, header.colIndex, "交易时间").slice(0, 10)
    const typeLabel = pickCol(cols, header.colIndex, "收/支")
    const amountStr = pickCol(cols, header.colIndex, "金额", "金额(元)", "金额（元）")
    const counterparty = pickCol(cols, header.colIndex, "交易对方")
    const desc = pickCol(cols, header.colIndex, "商品说明", "商品")
    const remark = pickCol(cols, header.colIndex, "备注")
    const typeName = pickCol(cols, header.colIndex, "交易类型")

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

    const status = pickCol(cols, header.colIndex, "交易状态", "当前状态")
    if (status.includes("已关闭") || status.includes("已退款")) {
      unrecognized++
      continue
    }

    const matchText = [desc, remark, counterparty, typeName].filter(Boolean).join(" ")
    const explicitKey = resolveCategoryFromCell(typeName, cats)

    transactions.push({
      id: `tx_wx_${Date.now()}_${i}`,
      date,
      type,
      amount,
      categoryKey: suggestCategory(matchText, type, cats, explicitKey),
      memberId,
      note: noteFromDesc(desc),
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
  content: string,
  fileName = ""
): "alipay" | "wechat" | "unknown" {
  const name = fileName.toLowerCase()
  if (name.includes("支付宝") || name.includes("alipay")) return "alipay"
  if (name.includes("微信") || name.includes("wechat")) return "wechat"

  const sample = content.slice(0, 8000)
  if (sample.includes("微信支付账单明细") || sample.includes("微信账单")) {
    return "wechat"
  }
  if (
    sample.includes("支付宝账户") ||
    sample.includes("支付宝支付科技有限公司") ||
    (sample.includes("支付宝") &&
      (sample.includes("账单") || sample.includes("交易流水") || sample.includes("交易明细")))
  ) {
    return "alipay"
  }
  if (sample.includes("交易分类") && sample.includes("商品说明") && sample.includes("收/支")) {
    return "alipay"
  }
  if (sample.includes("商品说明") && sample.includes("收/支")) {
    return sample.includes("交易分类") ? "alipay" : "wechat"
  }
  if (sample.includes("交易类型") && sample.includes("收/支") && sample.includes("商品")) {
    return "wechat"
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

function findHeaderRowIndex(sheet: WorkSheet, XLSX: XlsxModule): number {
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

function parseImportDate(raw: unknown, XLSX: XlsxModule): string {
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
  memberId: string,
  XLSX: XlsxModule
): Transaction[] {
  return rows
    .map((row, idx) => {
      if (isHeaderLikeRow(row)) return null

      const date = parseImportDate(
        getCell(row, "date", "日期", "时间", "交易时间", "交易日期", "记账日期"),
        XLSX
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
      const remark = String(getCell(row, "note", "备注") ?? "").trim()
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
      const matchText = [product, remark, counterparty].filter(Boolean).join(" ")

      return {
        id: `tx_import_${Date.now()}_${idx}`,
        date,
        type,
        amount: Math.abs(amount),
        categoryKey: suggestCategory(matchText, type, cats, explicitKey),
        memberId: resolvedMemberId,
        note: noteFromDesc(product),
        createdAt: Date.now() + idx,
      }
    })
    .filter(Boolean) as Transaction[]
}

function sheetRowsFromWorkbook(wb: WorkBook, XLSX: XlsxModule): Record<string, unknown>[] {
  const sheetName = wb.SheetNames.includes("账单") ? "账单" : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const headerRow = findHeaderRowIndex(ws, XLSX)
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

// ===== 通用 CSV 快速解析（不依赖 xlsx 库）=====

/** 判断是否为纯文本 CSV（而非 Excel 格式） */
function looksLikePlainCsv(content: string): boolean {
  // Excel 二进制格式（.xls 实为 HTML 表格等）不含换行或含 <table>
  if (content.includes("<table") || content.includes("<html")) return false
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length === 0) return false
  // 至少有一行包含逗号或制表符，且不是二进制乱码
  return lines.some((l) => l.includes(",") || l.includes("\t"))
}

/** 解析纯文本 CSV 为行对象数组 */
function parsePlainCsvRows(content: string): Record<string, unknown>[] {
  const text = content.replace(/^\uFEFF/, "")
  const lines = text.split("\n").filter((l) => l.trim())
  if (lines.length === 0) return []

  // 确定分隔符
  const sample = lines[0]
  const delimiter = sample.includes("\t") ? "\t" : ","

  // 找到表头行（包含 日期/金额/类型 等关键词）
  let headerIdx = 0
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const joined = lines[i].toLowerCase()
    if (/日期|交易时间|交易日期|date/.test(joined) &&
        /金额|数额|amount/.test(joined) &&
        /类型|收\/支|收支|type/.test(joined)) {
      headerIdx = i
      break
    }
  }

  const headers = parseDelimitedLine(lines[headerIdx], delimiter)
  const headerMap = new Map<string, number>()
  headers.forEach((h, idx) => {
    const trimmed = h.trim()
    if (trimmed) headerMap.set(trimmed, idx)
  })

  const rows: Record<string, unknown>[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseDelimitedLine(lines[i], delimiter)
    if (cols.length < 3) continue
    const row: Record<string, unknown> = {}
    headers.forEach((h, idx) => {
      if (h.trim()) row[h.trim()] = cols[idx] ?? ""
    })
    // 也用通用列名
    if (!row["日期"] && !row["date"]) {
      const dateVal = pickFromCols(cols, headerMap, "日期", "date", "交易时间", "交易日期", "记账日期")
      if (dateVal) row["日期"] = dateVal
    }
    rows.push(row)
  }
  return rows
}

function pickFromCols(cols: string[], headerMap: Map<string, number>, ...names: string[]): string {
  for (const name of names) {
    const idx = headerMap.get(name)
    if (idx != null && cols[idx] != null) return cols[idx].trim()
  }
  return ""
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const cols: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      cols.push(cur.trim())
      cur = ""
    } else {
      cur += ch
    }
  }
  cols.push(cur.trim())
  return cols
}

/** 纯文本 CSV 行 → Transaction（不依赖 xlsx 日期解析） */
function rowsToTransactionsPlain(
  rows: Record<string, unknown>[],
  members: Member[],
  cats: Category[],
  memberId: string
): Transaction[] {
  return rows
    .map((row, idx) => {
      if (isHeaderLikeRow(row)) return null

      const date = parsePlainDate(
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
      const remark = String(getCell(row, "note", "备注") ?? "").trim()
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
      const matchText = [product, remark, counterparty].filter(Boolean).join(" ")

      return {
        id: `tx_import_${Date.now()}_${idx}`,
        date,
        type,
        amount: Math.abs(amount),
        categoryKey: suggestCategory(matchText, type, cats, explicitKey),
        memberId: resolvedMemberId,
        note: noteFromDesc(product),
        createdAt: Date.now() + idx,
      }
    })
    .filter(Boolean) as Transaction[]
}

/** 纯文本日期解析（不依赖 xlsx） */
function parsePlainDate(raw: unknown): string {
  if (raw == null || raw === "") return ""
  const s = String(raw).trim()
  // YYYY-MM-DD or YYYY/MM/DD
  const matched = s.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/)
  if (matched) {
    return `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}`
  }
  // YYYYMMDD
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`
  }
  return s.slice(0, 10)
}

export async function parseGenericCsv(
  content: string,
  members: Member[],
  cats: Category[] = [],
  memberId?: string
): Promise<ImportResult> {
  // 快速路径：纯文本 CSV 无需加载 xlsx 库（移动端可省数秒）
  if (looksLikePlainCsv(content)) {
    const recorder = memberId || members[0]?.id || ""
    const rows = parsePlainCsvRows(content)
    const transactions = rowsToTransactionsPlain(rows, members, cats, recorder)
    return buildGenericResult(transactions, recorder)
  }

  // 回退到 xlsx 解析（处理 Excel 另存为 CSV 的特殊情况）
  const XLSX = await loadXlsx()
  const recorder = memberId || members[0]?.id || ""
  const text = content.replace(/^\uFEFF/, "")
  const wb = XLSX.read(text, { type: "string", cellDates: true })
  const transactions = rowsToTransactions(
    sheetRowsFromWorkbook(wb, XLSX),
    members,
    cats,
    recorder,
    XLSX
  )
  return buildGenericResult(transactions, recorder)
}

export async function parseGenericXlsx(
  buffer: ArrayBuffer,
  members: Member[],
  cats: Category[] = [],
  memberId?: string
): Promise<ImportResult> {
  const XLSX = await loadXlsx()
  const recorder = memberId || members[0]?.id || ""
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true })
  const transactions = rowsToTransactions(
    sheetRowsFromWorkbook(wb, XLSX),
    members,
    cats,
    recorder,
    XLSX
  )
  return buildGenericResult(transactions, recorder)
}
