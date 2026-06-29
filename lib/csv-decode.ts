/** 账单 CSV 解码：支付宝导出为 GBK，微信/通用多为 UTF-8 */
export function decodeBillCsv(buffer: ArrayBuffer): string {
  const utf8 = decodeWithLabel(buffer, "utf-8")
  const gbk = decodeWithLabel(buffer, "gbk")

  const utf8Score = scoreBillText(utf8)
  const gbkScore = scoreBillText(gbk)

  const best = gbkScore > utf8Score ? gbk : utf8
  return normalizeLineEndings(best.replace(/^\uFEFF/, ""))
}

function decodeWithLabel(buffer: ArrayBuffer, label: string): string {
  try {
    return new TextDecoder(label).decode(buffer)
  } catch {
    return ""
  }
}

function scoreBillText(text: string): number {
  if (!text) return -10
  let score = 0
  if (text.includes("交易时间")) score += 4
  if (text.includes("收/支")) score += 3
  if (text.includes("支付宝")) score += 3
  if (text.includes("支付宝账户")) score += 2
  if (text.includes("交易分类")) score += 2
  if (text.includes("商品说明")) score += 2
  if (text.includes("微信支付账单明细")) score += 4
  if (text.includes("微信")) score += 1
  const bad = (text.match(/\uFFFD/g) || []).length
  score -= bad * 2
  return score
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}
