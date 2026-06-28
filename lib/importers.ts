import type { ImportBatch, Transaction } from "./types"

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
