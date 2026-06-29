# 优化5：底部导航栏图标替换（A3方案）

## 背景

已在 `public/tabbar/` 目录准备好 10 张像素风 PNG 图标（128×128px）：

- home.png / home-active.png — 首页（正常/高饱和选中）
- flow.png / flow-active.png — 流水账单（正常/高饱和选中）
- review.png / review-active.png — 复盘统计（正常/高饱和选中）
- mine.png / mine-active.png — 我的（正常/高饱和选中）
- record.png — 记账（中间凸起按钮）

> ⚠️ 前置步骤：先在终端执行以下命令把图标复制到项目目录
>
> ```bash
> cp /tmp/tabbar-output/*.png ~/Documents/记账app/-pwav1-移植版/public/tabbar/
> ```

---

## 需要修改 3 个文件

### 1. `lib/constants.ts` — TABS 数组加 imgActive 字段

改为：

```ts
export const TABS = [
  { key: "home" as const, img: "/tabbar/home.png", imgActive: "/tabbar/home-active.png", label: "首页" },
  { key: "flow" as const, img: "/tabbar/flow.png", imgActive: "/tabbar/flow-active.png", label: "流水" },
  { key: "record" as const, img: "/tabbar/record.png", imgActive: "/tabbar/record.png", label: "" },
  { key: "review" as const, img: "/tabbar/review.png", imgActive: "/tabbar/review-active.png", label: "复盘" },
  { key: "mine" as const, img: "/tabbar/mine.png", imgActive: "/tabbar/mine-active.png", label: "我的" },
]
```

### 2. `components/TabBar.tsx` — 双图切换 + record 用图片替换 + 号

```tsx
import { TABS } from "@/lib/constants"
import type { Tab } from "@/lib/types"

export function TabBar({
  tab,
  onSwitch,
  onRecord,
}: {
  tab: Tab
  onSwitch: (t: Tab) => void
  onRecord: () => void
}) {
  return (
    <nav className="tabbar">
      {TABS.map((tb) =>
        tb.key === "record" ? (
          <button key={tb.key} className="tab center" onClick={onRecord} aria-label="记一笔">
            <span className="plus">
              <img className="t-img record-img" src={tb.img} alt="" aria-hidden="true" />
            </span>
          </button>
        ) : (
          <button key={tb.key} className={`tab ${tab === tb.key ? "active" : ""}`} onClick={() => onSwitch(tb.key)}>
            <img className="t-img" src={tab === tb.key ? tb.imgActive : tb.img} alt="" aria-hidden="true" />
            {tb.label}
          </button>
        )
      )}
    </nav>
  )
}
```

### 3. `components/styles/ledger.css` — Tab 样式调整

找到 `.tab .t-img` 等相关样式（约 295-301 行），改为：

```css
/* Tab 栏 - 双图切换方案 */
.app .tab .t-img { width: 30px; height: 30px; image-rendering: pixelated; transition: transform .12s steps(2); }
.app .tab.active { color: var(--accent-dark); }
.app .tab.active .t-img { transform: translateY(-1px) scale(1.08); }
.app .tab:active { transform: translateY(2px); }
.app .tab.center { flex: 0 0 auto; }
.app .tab.center .plus { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; background: var(--accent); border: 4px solid var(--ink); border-radius: 14px; box-shadow: 3px 3px 0 var(--ink); transition: transform .08s steps(2), box-shadow .08s steps(2); overflow: hidden; }
.app .tab.center .plus .record-img { width: 32px; height: 32px; image-rendering: pixelated; }
.app .tab.center:active .plus { transform: translate(2px,2px); box-shadow: 0 0 0 var(--ink); }
```

**关键改动：**

- `.t-img` 去掉 `filter: saturate(.55) opacity(.7)`（现在用双图切换替代）
- `.active .t-img` 去掉 `filter: none`
- `.plus` 去掉 `color` 和 `font-size`（不再用文字 + 号），加 `overflow: hidden`
- 新增 `.record-img` 32×32px 样式

---

## 4. 清理旧图标文件

删除以下 4 个不再使用的文件：

- `public/nav-home.png`
- `public/nav-flow.png`
- `public/nav-review.png`
- `public/nav-mine.png`

---

## 验收标准

1. 底部导航栏 5 个 tab 全部显示像素风图标
2. 选中 tab 时自动切换为高饱和版本（无 CSS filter）
3. 中间记账按钮显示 record.png 图标而非文字 +
4. build 通过
