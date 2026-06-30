# 优化10：4 项功能修复

## 问题1：创建账本界面小字描述灰色字体改成白色

### 定位
- `components/modals/RoomSetup.tsx` 第 116 行 `<small>新建共享账本，获取邀请码</small>`、第 128 行 `<small>输入邀请码，加入伴侣账本</small>`、第 90 行 `<p className="room-setup-subtitle">创建或加入账本，和TA一起记账</p>`
- `components/styles/ledger.css` 第 773 行 `.room-setup-subtitle` 和第 861 行 `.room-setup-btn-text small` 的 `color: var(--text-sub)` 是灰色

### 改动
**`components/styles/ledger.css`**：

找到第 773-776 行：
```css
.app .room-setup-subtitle {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 12px;
  color: var(--text-sub);
}
```
改为：
```css
.app .room-setup-subtitle {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 12px;
  color: #FFFFFF;
}
```

找到第 861-865 行：
```css
.app .room-setup-btn-text small {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 10px;
  color: var(--text-sub);
}
```
改为：
```css
.app .room-setup-btn-text small {
  font-family: var(--font-pixel-cjk), monospace;
  font-size: 10px;
  color: #FFFFFF;
}
```

同时找到第 866-869 行 `.room-setup-footer` 也改成白色：
```css
.app .room-setup-footer {
  font-family: var(--font-pixel), monospace;
  font-size: 8px;
  color: var(--text-sub);
}
```
改为：
```css
.app .room-setup-footer {
  font-family: var(--font-pixel), monospace;
  font-size: 8px;
  color: #FFFFFF;
  opacity: 0.7;
}
```
（底部 START YOUR JOURNEY 保留 0.7 透明度，跟按钮区分层次）

---

## 问题2：切换房间后，我的界面顶部模块的背景图没有保存

### 根因分析
背景图（coupleBg）存的是 base64 data URL，存在 localStorage 的 `STORAGE_KEY` 中。切换房间时（MineTab.tsx 第 195-197 行）：

```ts
localStorage.removeItem("couple-room-id")
window.location.reload()
```

`removeItem("couple-room-id")` 只删了房间号，**没有删除** `STORAGE_KEY`（含 coupleBg）。reload 后 `useLedger` 初始化 `loadState()` 读的仍是旧 STORAGE_KEY，但 `couple-room-id` 已空 → 新房间不会有旧背景图。

**但问题可能是：** 切换房间后 `syncFromCloud()` 拉取云端数据覆盖了本地，**云端没有 coupleBg 字段**（Supabase 没存 coupleBg），导致 merge 后 coupleBg 回到默认空值。

查看 `lib/storage.ts` 第 295-408 行 `syncFromCloud()` 函数：它拉取了 transactions、members、goals、import_batches，**但没有拉取 coupleBg**。而且 `pushToCloud()` 第 227-292 行也没有推送 coupleBg 到 Supabase。

**这就是根因：** coupleBg 只存在 localStorage，不参与云同步。切换房间 → `syncFromCloud()` → 云端数据覆盖本地 → coupleBg 被覆盖成默认空值。

### 修复方案（两步）

#### 步骤 A：pushToCloud 增加 coupleBg 推送

**`lib/storage.ts`**：在 `pushToCloud()` 函数末尾（第 292 行之前），增加 coupleBg 推送到 Supabase 的 `couples` 表：

```ts
// 推送 coupleBg 到 couples 表
if (state.coupleBg && state.coupleBg.url) {
  const roomId = resolveRoomId(state)
  await runSupabaseVoid(() =>
    supabase!.from("couples").update({
      couple_bg_url: state.coupleBg.url,
      couple_bg_pos_x: state.coupleBg.posX,
      couple_bg_pos_y: state.coupleBg.posY,
    }).eq("room_id", roomId)
  )
}
```

#### 步骤 B：syncFromCloud 增加 coupleBg 拉取

**`lib/storage.ts`**：在 `syncFromCloud()` 函数中（第 400 行之前，import_batches 拉取之后），增加 coupleBg 拉取：

```ts
// 拉取 coupleBg
const coupleData = await runSupabaseQuery(() =>
  supabase!.from("couples").select("couple_bg_url, couple_bg_pos_x, couple_bg_pos_y").eq("room_id", roomId).single()
)
if (coupleData) {
  const row = coupleData as { couple_bg_url?: string; couple_bg_pos_x?: string; couple_bg_pos_y?: string }
  if (row.couple_bg_url) {
    local.coupleBg = normalizeCoupleBg({
      url: row.couple_bg_url,
      posX: row.couple_bg_pos_x || "50%",
      posY: row.couple_bg_pos_y || "center",
    })
  }
}
```

#### 步骤 C：Supabase couples 表新增 3 列

需要在 Supabase SQL Editor 执行：

```sql
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_url TEXT DEFAULT '';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_x TEXT DEFAULT '50%';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_y TEXT DEFAULT 'center';
```

**⚠️ 这一步需要用户在 Supabase 后台手动执行 SQL，代码改完后提醒用户操作。**

---

## 问题3：流水页面增加可选日期查看收支明细功能

### 定位
- `components/tabs/FlowTab.tsx`：当前按日期分组显示所有交易，没有日期筛选功能
- `hooks/useLedger.ts` 第 261-264 行：`filteredFlow = groupByDate(transactions, cats, members, flowFilter)`，只能按成员筛选
- `lib/stats.ts` 第 200 行 `groupByDate()`：接收 transactions 数组，按 date 分组

### 设计方案
在流水页面筛选区增加一个**月份选择器**（类似复盘界面的月份切换），用户可以选择查看某年某月的收支明细，默认显示当月。

### 改动

#### 1. `hooks/useLedger.ts` — 增加 flowYear / flowMonth 状态

在现有状态声明区域（约第 220-240 行），新增：

```ts
const [flowYear, setFlowYear] = useState(now.getFullYear())
const [flowMonth, setFlowMonth] = useState(now.getMonth() + 1)
```

修改 `filteredFlow` 的 useMemo（第 261-264 行）：

```ts
const filteredFlow = useMemo(
  () => groupByDate(
    transactions.filter(t => {
      const d = new Date(t.date + "T12:00:00")
      return d.getFullYear() === flowYear && d.getMonth() + 1 === flowMonth
    }),
    cats,
    members,
    flowFilter === "all" ? undefined : flowFilter
  ),
  [transactions, cats, members, flowFilter, flowYear, flowMonth]
)
```

增加月份切换函数（约第 265 行之后）：

```ts
const prevFlowMonth = useCallback(() => {
  if (flowMonth === 1) { setFlowMonth(12); setFlowYear(flowYear - 1) }
  else setFlowMonth(flowMonth - 1)
}, [flowMonth, flowYear])

const nextFlowMonth = useCallback(() => {
  if (flowMonth === 12) { setFlowMonth(1); setFlowYear(flowYear + 1) }
  else setFlowMonth(flowMonth + 1)
}, [flowMonth, flowYear])
```

在 ledger 返回对象中新增：`flowYear, flowMonth, prevFlowMonth, nextFlowMonth`

#### 2. `components/tabs/FlowTab.tsx` — 增加月份切换 UI

在 Props 类型中新增：

```ts
| "flowYear"
| "flowMonth"
| "prevFlowMonth"
| "nextFlowMonth"
```

从 ledger 中解构新增字段。

在筛选区（`flow-filter-row` div 内，第 148-174 行之间）的顶部增加月份切换：

```tsx
<div className="flow-month-switch">
  <button className="ms-btn" onClick={prevFlowMonth}>◀</button>
  <span className="ms-now">{flowYear}年 {flowMonth}月</span>
  <button className="ms-btn" onClick={nextFlowMonth}>▶</button>
</div>
```

#### 3. `components/styles/ledger.css` — 增加月份切换样式

在 `.flow-filter-row` 相关样式区域（约第 135-137 行之后）新增：

```css
.app .flow-month-switch { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px; }
.app .flow-month-switch .ms-now { font-family: var(--font-pixel-cjk), monospace; font-size: 13px; font-weight: 700; color: var(--ink); }
.app .flow-month-switch .ms-btn { width: 28px; height: 28px; border: 2px solid var(--ink); border-radius: 8px; background: var(--card); color: var(--ink); font-family: var(--font-pixel), monospace; font-size: 10px; cursor: pointer; box-shadow: 2px 2px 0 var(--ink); transition: transform .08s steps(2); }
.app .flow-month-switch .ms-btn:active { transform: translate(2px, 2px); box-shadow: none; }
```

（`.ms-btn` 和 `.ms-now` 复用复盘界面的命名，样式一致）

---

## 问题4：复盘界面大额消费提示和下面的提示框合并，做成黄底加粗白字

### 定位
- `components/tabs/ReviewTab.tsx` 第 68-75 行：大额消费提醒分两部分——
  1. 第 68 行：stat-table 中的一行 `<span className="st-l">大额消费提醒</span><span className="st-v">...</span>`
  2. 第 70-75 行：单独的 `.tip-card` 显示第一条大额消费详情
- 当前 `.tip-card` 样式（ledger.css 第 211 行）：`background: var(--card)` 白色背景、10px 字体
- 当前 `.st-row` 样式：普通行，无特殊背景

### 改动方案
合并 stat-table 的「大额消费提醒」行 + 下面的 `.tip-card` 为**一个黄底加粗白字的合并提示框**，包含：提醒标题 + 所有大额消费列表（不只第一条）。

#### 1. `components/tabs/ReviewTab.tsx` — 修改习惯分析 card 部分

找到第 63-76 行（习惯分析 card），当前：
```tsx
<div className="section-title">习惯分析</div>
<div className="card">
  <div className="stat-table">
    <div className="st-row"><span className="st-l">TOP3支出分类</span><span className="st-v">{habitAnalysis.topCategories.length ? habitAnalysis.topCategories.map((t) => `${t.name} ${yuan(t.amount)}(${t.pct}%)`).join(" · ") : "—"}</span></div>
    <div className="st-row"><span className="st-l">环比变化</span><span className="st-v">{habitAnalysis.momChange}</span></div>
    <div className="st-row"><span className="st-l">大额消费提醒</span><span className="st-v">{habitAnalysis.bigSpends.length ? `${habitAnalysis.bigSpends.length} 笔超过日均×3` : "暂无"}</span></div>
  </div>
  {habitAnalysis.bigSpends.length > 0 && (
    <div className="tip-card" style={{ marginTop: 12 }}>
      <span className="tip-ico">!</span>
      <span>{habitAnalysis.bigSpends[0].date} {habitAnalysis.bigSpends[0].note} {yuan(habitAnalysis.bigSpends[0].amount)}，{habitAnalysis.bigSpends[0].flag}</span>
    </div>
  )}
</div>
```

改为：
```tsx
<div className="section-title">习惯分析</div>
<div className="card">
  <div className="stat-table">
    <div className="st-row"><span className="st-l">TOP3支出分类</span><span className="st-v">{habitAnalysis.topCategories.length ? habitAnalysis.topCategories.map((t) => `${t.name} ${yuan(t.amount)}(${t.pct}%)`).join(" · ") : "—"}</span></div>
    <div className="st-row"><span className="st-l">环比变化</span><span className="st-v">{habitAnalysis.momChange}</span></div>
  </div>
  {habitAnalysis.bigSpends.length > 0 && (
    <div className="big-spend-alert">
      <div className="big-spend-alert-title">
        <span className="tip-ico warn-ico">!</span>
        <span>大额消费提醒 · {habitAnalysis.bigSpends.length} 笔超过日均×3</span>
      </div>
      <div className="big-spend-list">
        {habitAnalysis.bigSpends.map((s, i) => (
          <div key={i} className="big-spend-row">
            <span>{s.date}</span>
            <span>{s.note}</span>
            <span className="big-spend-amt">{yuan(s.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )}
  {habitAnalysis.bigSpends.length === 0 && (
    <div className="stat-table">
      <div className="st-row"><span className="st-l">大额消费提醒</span><span className="st-v">暂无</span></div>
    </div>
  )}
</div>
```

#### 2. `components/styles/ledger.css` — 新增黄底加粗白字样式

在 `.tip-card` 样式（第 211 行）之后新增：

```css
.app .big-spend-alert { background: #FFD600; border: 3px solid var(--ink); border-radius: 14px; padding: 14px; margin-top: 12px; box-shadow: 4px 4px 0 var(--ink); }
.app .big-spend-alert-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-pixel-cjk), monospace; font-size: 13px; font-weight: 700; color: #FFFFFF; text-shadow: 1px 1px 0 var(--ink); margin-bottom: 10px; }
.app .warn-ico { background: #D32F2F !important; }
.app .big-spend-list { display: flex; flex-direction: column; gap: 6px; }
.app .big-spend-row { display: flex; align-items: center; gap: 8px; font-family: var(--font-pixel-cjk), monospace; font-size: 11px; font-weight: 700; color: #FFFFFF; text-shadow: 1px 1px 0 rgba(0,0,0,.4); }
.app .big-spend-amt { font-family: var(--font-pixel), monospace; color: #FFFFFF; }
```

---

## 验收标准

1. 创建账本界面的 `<small>` 描述文字和 `<p className="room-setup-subtitle">` 均为白色
2. 切换房间后重新进入，我的界面顶部模块的背景图仍然显示之前设置的图片
3. Supabase couples 表有 `couple_bg_url / couple_bg_pos_x / couple_bg_pos_y` 3 列（需要用户手动执行 SQL）
4. 流水页面顶部有月份切换按钮（◀ ▶），默认显示当月收支明细
5. 切换月份后，流水列表只显示所选月份的交易
6. 复盘界面大额消费提醒从 stat-table + tip-card 两块合并为一个黄底（#FFD600）加粗白字提示框
7. 提示框内显示所有大额消费条目（不只第一条），每行显示日期+备注+金额
8. 没有大额消费时仍显示「暂无」行
9. `npm run build` 通过

---

## ⚠️ 需要用户手动操作

问题2（背景图保存）需要在 Supabase SQL Editor 执行以下 SQL：

```sql
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_url TEXT DEFAULT '';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_x TEXT DEFAULT '50%';
ALTER TABLE couples ADD COLUMN IF NOT EXISTS couple_bg_pos_y TEXT DEFAULT 'center';
```

执行完后再测试切换房间后背景图是否保留。
