import { describe, expect, it } from "vitest"
import { INIT_CATS } from "./constants"
import { matchCategoryByKeywords } from "./category-keywords"

describe("category-keywords", () => {
  it("品牌词命中餐饮", () => {
    expect(matchCategoryByKeywords("美团外卖-黄焖鸡", "out", INIT_CATS)).toBe("food")
    expect(matchCategoryByKeywords("饿了么超级会员", "out", INIT_CATS)).toBe("food")
  })

  it("交通关键词命中", () => {
    expect(matchCategoryByKeywords("滴滴出行行程", "out", INIT_CATS)).toBe("car")
    expect(matchCategoryByKeywords("地铁扫码", "out", INIT_CATS)).toBe("car")
  })

  it("收入关键词命中", () => {
    expect(matchCategoryByKeywords("3月工资代发", "in", INIT_CATS)).toBe("salary")
    expect(matchCategoryByKeywords("微信红包", "in", INIT_CATS)).toBe("gift")
  })

  it("未命中返回空字符串", () => {
    expect(matchCategoryByKeywords("未知商户消费", "out", INIT_CATS)).toBe("")
    expect(matchCategoryByKeywords("不明收入款项", "in", INIT_CATS)).toBe("")
  })

  it("多命中时高优先级优先", () => {
    expect(matchCategoryByKeywords("美团外卖", "out", INIT_CATS)).toBe("food")
  })

  it("新增默认支出分类关键词", () => {
    expect(matchCategoryByKeywords("宠物医院", "out", INIT_CATS)).toBe("pet")
    expect(matchCategoryByKeywords("医美护肤", "out", INIT_CATS)).toBe("beauty")
    expect(matchCategoryByKeywords("口红彩妆", "out", INIT_CATS)).toBe("cosmetics")
    expect(matchCategoryByKeywords("婚礼份子钱", "out", INIT_CATS)).toBe("social")
    expect(matchCategoryByKeywords("加油费", "out", INIT_CATS)).toBe("vehicle")
  })
})
