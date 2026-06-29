import * as XLSX from "@e965/xlsx"
import type { Category, ImportBatch, Member, Transaction, TxType } from "./types"

// ===== 导入结果类型 =====
export interface ImportResult {
  transactions: Transaction[]
  batch: Omit<ImportBatch, "time">
  unrecognized: number
}

// ===== 分类映射 =====
// 支付宝/微信关键词 → 系统分类 key
const CATEGORY_KEYWORDS: Record<string, string> = {
  // 餐饮
  餐饮: "food", 美食: "food", 吃饭: "food", 外卖: "food", 早餐: "food",
  午餐: "food", 晚餐: "food", 餐厅: "food", 咖啡: "food", 饮品: "food",
  // 交通
  交通: "car", 打车: "car", 加油: "car", 地铁: "car", 公交: "car",
  停车: "car", 高铁: "car", 机票: "car", 出租车: "car",
  // 购物
  购物: "shop", 超市: "shop", 百货: "shop", 服装: "shop", 电商: "shop",
  网购: "shop", 数码: "shop", 家电: "shop",
  // 居家
  居家: "home", 水电: "home", 物业: "home", 房租: "home", 缴费: "home",
  话费: "home", 网费: "home", 燃气: "home",
  // 娱乐
  娱乐: "fun", 游戏: "fun", 电影: "fun", 旅游: "fun", 健身: "fun",
  运动: "fun", 音乐: "fun", 视频: "fun",
  // 医疗
  医疗: "med", 医院: "med", 药品: "med", 体检: "med", 牙科: "med",
  // 工资收入
  工资: "salary", 薪资: "salary", 奖金: "salary", 补贴: "salary",
  // 红包/转账收入
  转账: "gift", 红包: "gift", 退款: "gift",
}

function guessCategory(desc: string, type: "out" | "in"): string {
  const lower = desc.toLowerCase()
  for (const [keyword, catKey] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword.toLowerCase())) return catKey
  }
  return type === "in" ? "salary" : "food"
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
  memberId: string
): ImportResult {
  const lines = content.split("\n").filter((l) => l.trim())
  const transactions: Transaction[] = []
  let unrecognized = 0
  let headerIdx = -1

  for (let i = 0; i < lines.length; i++) {
    // 找表头行
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
    const desc = cols[3]?.trim() || cols[2]?.trim() || ""
    const note = cols[9]?.trim() || ""

    // 过滤无效行
    if (!date || !amountStr) {
      unrecognized++
      continue
    }

    const amount = Math.abs(parseFloat(amountStr.replace(/[^\d.-]/g, "")))
    if (!Number.isFinite(amount) || amount <= 0) {
      unrecognized++
      continue
    }

    const type: "out" | "in" | "save" =
      typeLabel === "收入" ? "in" : typeLabel === "支出" ? "out" : "out"

    // 过滤已关闭/已退款的交易
    const status = cols[6]?.trim() || ""
    if (status.includes("关闭") || status.includes("退款")) {
      unrecognized++
      continue
    }

    transactions.push({
      id: `tx_ali_${Date.now()}_${i}`,
      date,
      type,
      amount,
      categoryKey: guessCategory(desc + note, type),
      memberId,
      note: desc || note,
      createdAt: Date.now() + i,
    })
  }

  return {
    transactions,
    batch: {
      ids: transactions.map((t) => t.id),
      source: "alipay",
      recorder: memberId,
      count: transactions.length,
    },
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
  memberId: string
): ImportResult {
  const lines = content.split("\n").filter((l) => l.trim())
  const transactions: Transaction[] = []
  let unrecognized = 0
  let headerIdx = -1

  for (let i = 0; i < lines.length; i++) {
    // 找表头行
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
    const desc = cols[3]?.trim() || cols[2]?.trim() || ""
    const note = cols[10]?.trim() || ""

    if (!date || !amountStr) {
      unrecognized++
      continue
    }

    const amount = Math.abs(parseFloat(amountStr.replace(/[^\d.-]/g, "")))
    if (!Number.isFinite(amount) || amount <= 0) {
      unrecognized++
      continue
    }

    const type: "out" | "in" | "save" =
      typeLabel === "收入" ? "in" : typeLabel === "支出" ? "out" : "out"

    const status = cols[7]?.trim() || ""
    if (status.includes("已关闭") || status.includes("已退款")) {
      unrecognized++
      continue
    }

    transactions.push({
      id: `tx_wx_${Date.now()}_${i}`,
      date,
      type,
      amount,
      categoryKey: guessCategory(desc + note, type),
      memberId,
      note: desc || note,
      createdAt: Date.now() + i,
    })
  }

  return {
    transactions,
    batch: {
      ids: transactions.map((t) => t.id),
      source: "wechat",
      recorder: memberId,
      count: transactions.length,
    },
    unrecognized,
  }
}

// ===== 自动检测来源 =====

export function detectSource(
  content: string
): "alipay" | "wechat" | "unknown" {
  const firstFew = content.slice(0, 500)
  // 微信账单在文件头有标识字样
  if (firstFew.includes("微信支付账单明细") || firstFew.includes("微信账单")) {
    return "wechat"
  }
  // 支付宝常见标识
  if (
    firstFew.includes("支付宝") &&
    (firstFew.includes("账单") || firstFew.includes("交易流水"))
  ) {
    return "alipay"
  }
  // 看列名特征
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

/** 判断是否为表头行（避免把标题行当数据） */
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

/** 扫描前 25 行，定位真正的列名行（兼容微信/支付宝 xlsx 顶部标题行） */
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
  // Excel 序列号被读成字符串（raw:false 时常见）
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

/** 通用导入格式说明（CSV / xlsx 共用） */
export const GENERIC_BILL_IMPORT_HINT =
  "无法识别账单数据，请确保文件包含 日期/类型/金额 列（类型：支出/收入/存钱 或 out/in/save）"

/** 将表格行解析为交易记录（CSV / xlsx 共用） */
function rowsToTransactions(
  rows: Record<string, unknown>[],
  members: Member[],
  cats: Category[]
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

      let categoryKey = String(
        getCell(row, "categoryKey", "分类", "category", "类别", "交易分类", "商品说明") ?? ""
      ).trim()
      if (categoryKey) {
        const byKey = cats.find((c) => c.key === categoryKey)
        const byLabel = cats.find((c) => c.label === categoryKey)
        if (byLabel) categoryKey = byLabel.key
        else if (!byKey) categoryKey = ""
      }

      let memberId = String(
        getCell(row, "memberId", "成员", "member", "经手人", "交易对方") ?? ""
      ).trim()
      if (memberId) {
        const matched = members.find((m) => m.id === memberId || m.name === memberId)
        memberId = matched?.id || memberId
      } else {
        memberId = members[0]?.id || ""
      }

      const note = String(getCell(row, "note", "备注", "说明") ?? "").trim()
      if (!date || !type || !Number.isFinite(amount) || amount <= 0) return null

      return {
        id: `tx_import_${Date.now()}_${idx}`,
        date,
        type,
        amount: Math.abs(amount),
        categoryKey: categoryKey || (type === "in" ? "salary" : type === "save" ? "save" : "food"),
        memberId,
        note,
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

/** 解析通用 CSV 账单（本应用导出 / 标准列名 / 微信支付宝 xlsx 转存） */
export function parseGenericCsv(
  content: string,
  members: Member[],
  cats: Category[] = []
): Transaction[] {
  const text = content.replace(/^\uFEFF/, "")
  const wb = XLSX.read(text, { type: "string", cellDates: true })
  return rowsToTransactions(sheetRowsFromWorkbook(wb), members, cats)
}

/** 解析通用 Excel 账单（.xlsx / .xls） */
export function parseGenericXlsx(
  buffer: ArrayBuffer,
  members: Member[],
  cats: Category[] = []
): Transaction[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true })
  return rowsToTransactions(sheetRowsFromWorkbook(wb), members, cats)
}
