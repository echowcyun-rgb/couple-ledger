import { describe, expect, it } from "vitest"
import { decodeBillCsv } from "./csv-decode"
import { detectSource, parseAlipayCSV } from "./importers"
import { INIT_CATS } from "./constants"

const ALIPAY_SAMPLE = `--------------------
导出信息
支付宝账户：test@alipay.com
共49笔记录
--------------------支付宝支付科技有限公司  电子客户回单---
交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注,
2026-06-28 20:32:58,交通出行,滴滴出行,chu***@didichuxing.com,滴滴快车打车-张师傅-06月28日行程,支出,19.40,花呗,交易成功,202606281,210_202606281,,,
2026-06-27 12:00:00,餐饮,美团,/,美团外卖订单午餐,支出,35.00,余额,交易成功,202606271,210_202606271,,,
`

describe("csv-decode", () => {
  it("UTF-8 中文 CSV 可正确解码", () => {
    const buf = new TextEncoder().encode(ALIPAY_SAMPLE).buffer
    const text = decodeBillCsv(buf)
    expect(text).toContain("交易时间")
    expect(text).toContain("支付宝账户")
  })
})

describe("detectSource", () => {
  it("识别支付宝内容特征", () => {
    expect(detectSource(ALIPAY_SAMPLE)).toBe("alipay")
  })

  it("识别支付宝文件名", () => {
    expect(detectSource("乱码内容", "支付宝交易明细(20260529-20260629).csv")).toBe("alipay")
  })
})

describe("parseAlipayCSV", () => {
  it("解析 12 列支付宝表头并提取交易", () => {
    const result = parseAlipayCSV(ALIPAY_SAMPLE, "wu", INIT_CATS)
    expect(result.transactions).toHaveLength(2)
    expect(result.transactions[0]).toMatchObject({
      date: "2026-06-28",
      type: "out",
      amount: 19.4,
      categoryKey: "car",
    })
    expect(result.transactions[0].note).toContain("滴滴")
    expect(result.transactions[1].categoryKey).toBe("food")
  })
})
