import { describe, expect, it } from "vitest"
import { decodeBillCsv } from "./csv-decode"
import { detectSource, parseAlipayCSV, parseGenericCsv } from "./importers"
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
      note: "滴滴快车打",
    })
    expect(result.transactions[0].note).toHaveLength(5)
    expect(result.transactions[1].categoryKey).toBe("food")
    expect(result.transactions[1].note).toBe("美团外卖订")
  })
})

describe("parseGenericCsv fast path", () => {
  it("纯文本 CSV 无需 xlsx 库即可解析", async () => {
    const csv = `日期,类型,金额,商品说明,备注
2026-06-01,支出,50.00,超市购物,
2026-06-02,收入,5000.00,工资,6月工资
2026-06-03,存钱,1000.00,定期存款,`
    const result = await parseGenericCsv(csv, [{ id: "m1", name: "我", avatar: "", gender: "female", payday: 10 }], INIT_CATS, "m1")
    expect(result.batch.source).toBe("generic")
    expect(result.transactions).toHaveLength(3)
    expect(result.transactions[0]).toMatchObject({
      date: "2026-06-01",
      type: "out",
      amount: 50,
    })
    expect(result.transactions[1]).toMatchObject({
      date: "2026-06-02",
      type: "in",
      amount: 5000,
    })
    expect(result.transactions[2]).toMatchObject({
      date: "2026-06-03",
      type: "save",
      amount: 1000,
    })
  })

  it("制表符分隔的 CSV 也能解析", async () => {
    const tsv = `日期\t类型\t金额\t商品说明
2026-06-01\t支出\t25.50\t咖啡`
    const result = await parseGenericCsv(tsv, [{ id: "m1", name: "我", avatar: "", gender: "female", payday: 10 }], INIT_CATS, "m1")
    expect(result.transactions).toHaveLength(1)
    expect(result.transactions[0]).toMatchObject({
      date: "2026-06-01",
      type: "out",
      amount: 25.5,
    })
  })
})
