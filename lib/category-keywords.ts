import type { Category, TxType } from "./types"

/** 单条关键词规则 */
export interface CategoryKeywordRule {
  keyword: string
  categoryKey: string
  priority: number
}

export const CATEGORY_KEYWORD_RULES: CategoryKeywordRule[] = [
  // 餐饮
  { keyword: "美团外卖", categoryKey: "food", priority: 100 },
  { keyword: "美团", categoryKey: "food", priority: 100 },
  { keyword: "饿了么", categoryKey: "food", priority: 100 },
  { keyword: "肯德基", categoryKey: "food", priority: 100 },
  { keyword: "麦当劳", categoryKey: "food", priority: 100 },
  { keyword: "星巴克", categoryKey: "food", priority: 100 },
  { keyword: "瑞幸", categoryKey: "food", priority: 100 },
  { keyword: "蜜雪冰城", categoryKey: "food", priority: 100 },
  { keyword: "喜茶", categoryKey: "food", priority: 100 },
  { keyword: "餐厅", categoryKey: "food", priority: 90 },
  { keyword: "食堂", categoryKey: "food", priority: 90 },
  { keyword: "咖啡", categoryKey: "food", priority: 90 },
  { keyword: "外卖", categoryKey: "food", priority: 80 },
  { keyword: "餐饮", categoryKey: "food", priority: 80 },

  // 交通
  { keyword: "滴滴", categoryKey: "car", priority: 100 },
  { keyword: "高德打车", categoryKey: "car", priority: 100 },
  { keyword: "哈啰", categoryKey: "car", priority: 100 },
  { keyword: "12306", categoryKey: "car", priority: 100 },
  { keyword: "高铁", categoryKey: "car", priority: 100 },
  { keyword: "火车", categoryKey: "car", priority: 100 },
  { keyword: "机票", categoryKey: "car", priority: 100 },
  { keyword: "航空", categoryKey: "car", priority: 100 },
  { keyword: "地铁", categoryKey: "car", priority: 90 },
  { keyword: "公交", categoryKey: "car", priority: 90 },
  { keyword: "加油", categoryKey: "car", priority: 90 },
  { keyword: "停车", categoryKey: "car", priority: 90 },
  { keyword: "交通", categoryKey: "car", priority: 80 },

  // 购物
  { keyword: "淘宝", categoryKey: "shop", priority: 100 },
  { keyword: "天猫", categoryKey: "shop", priority: 100 },
  { keyword: "京东", categoryKey: "shop", priority: 100 },
  { keyword: "拼多多", categoryKey: "shop", priority: 100 },
  { keyword: "唯品会", categoryKey: "shop", priority: 100 },
  { keyword: "抖音", categoryKey: "shop", priority: 100 },
  { keyword: "快手", categoryKey: "shop", priority: 100 },
  { keyword: "超市", categoryKey: "shop", priority: 95 },
  { keyword: "便利店", categoryKey: "shop", priority: 95 },
  { keyword: "购物", categoryKey: "shop", priority: 80 },

  // 居家
  { keyword: "水电费", categoryKey: "home", priority: 100 },
  { keyword: "燃气", categoryKey: "home", priority: 100 },
  { keyword: "物业费", categoryKey: "home", priority: 100 },
  { keyword: "房租", categoryKey: "home", priority: 100 },
  { keyword: "电费", categoryKey: "home", priority: 100 },
  { keyword: "水费", categoryKey: "home", priority: 100 },
  { keyword: "居家", categoryKey: "home", priority: 90 },

  // 娱乐
  { keyword: "电影", categoryKey: "fun", priority: 90 },
  { keyword: "影院", categoryKey: "fun", priority: 90 },
  { keyword: "ktv", categoryKey: "fun", priority: 90 },
  { keyword: "steam", categoryKey: "fun", priority: 85 },
  { keyword: "游戏", categoryKey: "fun", priority: 80 },
  { keyword: "娱乐", categoryKey: "fun", priority: 80 },

  // 医疗
  { keyword: "医院", categoryKey: "med", priority: 100 },
  { keyword: "药店", categoryKey: "med", priority: 100 },
  { keyword: "挂号", categoryKey: "med", priority: 100 },
  { keyword: "门诊", categoryKey: "med", priority: 100 },
  { keyword: "医疗", categoryKey: "med", priority: 90 },

  // 工资
  { keyword: "工资", categoryKey: "salary", priority: 100 },
  { keyword: "薪资", categoryKey: "salary", priority: 100 },
  { keyword: "报销", categoryKey: "salary", priority: 90 },

  // 红包
  { keyword: "红包", categoryKey: "gift", priority: 100 },
  { keyword: "转账", categoryKey: "gift", priority: 70 },
]

const rulesByPriority = [...CATEGORY_KEYWORD_RULES].sort((a, b) => b.priority - a.priority)

/**
 * 根据商品说明/备注/交易对方等文本推测分类
 * 无命中返回 ""（不兜底猜测）
 */
export function matchCategoryByKeywords(
  text: string,
  type: TxType,
  cats: Category[]
): string {
  const normalized = text.toLowerCase()
  if (!normalized.trim()) return ""

  const validKeys = new Set(
    cats.filter((c) => c.type === type).map((c) => c.key)
  )
  if (validKeys.size === 0) return ""

  for (const rule of rulesByPriority) {
    if (!validKeys.has(rule.categoryKey)) continue
    if (normalized.includes(rule.keyword.toLowerCase())) {
      return rule.categoryKey
    }
  }

  return ""
}
