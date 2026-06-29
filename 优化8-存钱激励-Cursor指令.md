# 优化8：存钱激励 + 发薪日提醒 + 成员限制（5 项）

## 问题1：更新历史可修改

### 背景
`UpdateGoalSheet.tsx` 第 106-117 行显示更新历史列表，当前只读，每行显示「日期 / 备注 / 金额」。用户希望能修改历史记录（改备注、改金额、删除某条）。

### 文件1：`lib/types.ts`

`GoalHistoryEntry` 加 `id` 字段（用于精准定位每条历史）：

```ts
export interface GoalHistoryEntry {
  id: string  // 新增
  date: string
  amount: number
  note: string
  memberId?: string
}
```

> ⚠️ 兼容性：现有 history 数据没有 id。在 `saveUpdateGoal` 写入历史时生成 id（用 `Date.now().toString()` + 随机后缀）。读取历史时如果某条没有 id，用 `date + amount + note` 作为临时 key 渲染，编辑时再补 id。

### 文件2：`hooks/useLedger.ts`

**改动 1**：`saveUpdateGoal`（约 475 行）写入历史时加 id：

找到第 503 行：
```tsx
history: [
  { date: todayStr, amount: historyAmount, note: historyNote, memberId: updateMemberId },
  ...x.history,
].slice(0, 20),
```

改为：
```tsx
history: [
  { id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, date: todayStr, amount: historyAmount, note: historyNote, memberId: updateMemberId },
  ...x.history,
].slice(0, 20),
```

**改动 2**：新增 `editGoalHistory` 函数（在 `saveUpdateGoal` 后面加）：

```tsx
const editGoalHistory = useCallback((goalId: number, historyId: string, patch: Partial<Pick<GoalHistoryEntry, "amount" | "note">>) => {
  setState((s) => ({
    ...s,
    goals: s.goals.map((g) => {
      if (g.id !== goalId) return g
      const newHistory = g.history.map((h) => {
        const hid = h.id || `${h.date}_${h.amount}_${h.note}`
        return hid === historyId ? { ...h, ...patch, id: h.id || hid } : h
      })
      // 重新计算 current = 所有正数历史之和（如果有负数历史则减）
      const newCurrent = newHistory.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
      return { ...g, history: newHistory, current: newCurrent }
    }),
  }))
}, [])

const deleteGoalHistory = useCallback((goalId: number, historyId: string) => {
  setState((s) => ({
    ...s,
    goals: s.goals.map((g) => {
      if (g.id !== goalId) return g
      const newHistory = g.history.filter((h) => {
        const hid = h.id || `${h.date}_${h.amount}_${h.note}`
        return hid !== historyId
      })
      const newCurrent = newHistory.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
      return { ...g, history: newHistory, current: newCurrent }
    }),
  }))
}, [])
```

**改动 3**：返回对象加 `editGoalHistory` 和 `deleteGoalHistory`（约 973 行 `saveUpdateGoal` 附近）。

### 文件3：`components/modals/UpdateGoalSheet.tsx`

**改动 1**：props 扩展，接收新回调：

```tsx
export function UpdateGoalSheet({
  ledger,
}: {
  ledger: Pick<
    Ledger,
    | "updateGoalId"
    | "setUpdateGoalId"
    | "updateGoal"
    | "updateMode"
    | "setUpdateMode"
    | "updateAmount"
    | "setUpdateAmount"
    | "updateNote"
    | "setUpdateNote"
    | "updateMemberId"
    | "setUpdateMemberId"
    | "members"
    | "saveUpdateGoal"
    | "editGoalHistory"    // 新增
    | "deleteGoalHistory"  // 新增
  >
})
```

**改动 2**：加编辑 state：

```tsx
const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null)
const [editHistAmount, setEditHistAmount] = useState("")
const [editHistNote, setEditHistNote] = useState("")
```

**改动 3**：更新历史列表改造（第 106-117 行）。每行加「编辑」「删除」按钮，编辑中的行变成输入框：

```tsx
{updateGoal.history.length > 0 && (
  <div className="upd-history">
    <div className="upd-h-title">更新历史</div>
    {updateGoal.history.map((h, i) => {
      const hid = h.id || `${h.date}_${h.amount}_${h.note}`
      const isEditing = editingHistoryId === hid
      return (
        <div className="upd-h-row" key={i}>
          {isEditing ? (
            <>
              <span className="upd-h-date">{h.date}</span>
              <input
                className="upd-h-input-amt"
                type="number"
                inputMode="decimal"
                value={editHistAmount}
                onChange={(e) => setEditHistAmount(e.target.value)}
                aria-label="金额"
              />
              <input
                className="upd-h-input-note"
                value={editHistNote}
                onChange={(e) => setEditHistNote(e.target.value)}
                aria-label="备注"
              />
              <button
                className="upd-h-btn save"
                onClick={() => {
                  editGoalHistory(updateGoal.id, hid, {
                    amount: Number(editHistAmount) || 0,
                    note: editHistNote,
                  })
                  setEditingHistoryId(null)
                }}
              >✓</button>
              <button
                className="upd-h-btn cancel"
                onClick={() => setEditingHistoryId(null)}
              >✕</button>
            </>
          ) : (
            <>
              <span className="upd-h-date">{h.date}</span>
              <span className="upd-h-note">{h.note}</span>
              <span className="upd-h-amt">¥{h.amount}</span>
              <button
                className="upd-h-btn edit"
                onClick={() => {
                  setEditingHistoryId(hid)
                  setEditHistAmount(String(h.amount))
                  setEditHistNote(h.note)
                }}
                aria-label="编辑"
              >✎</button>
              <button
                className="upd-h-btn del"
                onClick={() => {
                  if (confirm(`删除这条历史？\n${h.date} ¥${h.amount} ${h.note}\n删除后存钱总额会重新计算`)) {
                    deleteGoalHistory(updateGoal.id, hid)
                  }
                }}
                aria-label="删除"
              >🗑</button>
            </>
          )}
        </div>
      )
    })}
  </div>
)}
```

### 文件4：`components/styles/ledger.css`

新增更新历史编辑样式（加在 `.upd-history` 相关样式附近）：

```css
.app .upd-h-row { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px dashed rgba(0,0,0,.08); font-size: 11px; }
.app .upd-h-date { color: var(--text-sub); min-width: 64px; }
.app .upd-h-note { flex: 1; color: var(--text); }
.app .upd-h-amt { color: var(--accent-dark); font-family: var(--font-pixel), monospace; min-width: 56px; text-align: right; }
.app .upd-h-input-amt { width: 56px; padding: 2px 4px; border: 2px solid var(--ink); border-radius: 4px; font-family: var(--font-pixel), monospace; font-size: 11px; }
.app .upd-h-input-note { flex: 1; padding: 2px 4px; border: 2px solid var(--ink); border-radius: 4px; font-size: 11px; }
.app .upd-h-btn { background: none; border: 1px solid var(--ink); border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; line-height: 1; }
.app .upd-h-btn.edit { color: var(--accent-dark); }
.app .upd-h-btn.del { color: var(--out); }
.app .upd-h-btn.save { color: #2d8a3e; border-color: #2d8a3e; }
.app .upd-h-btn.cancel { color: var(--text-sub); }
```

---

## 问题2：发薪日当天字幕改

### 文件：`components/tabs/HomeTab.tsx`

当前第 141-145 行，发薪日当天显示「今天发工资啦！」+「记一笔」按钮。

改为：

```tsx
{mIsPayday ? (
  <>
    <span className="ptext payday-today-text">今天是发薪日，记得存一笔哦！</span>
    <button className="px-btn solid sm" style={{ marginLeft: "auto" }} onClick={openRecord}>记一笔 ▶</button>
  </>
) : (
  // ... 不变
)}
```

### 文件：`components/styles/ledger.css`

新增发薪日当天文字样式（红色加粗）：

```css
.app .payrow.today .payday-today-text { color: #D32F2F; font-weight: 700; font-size: 12px; }
```

> 注意：`.payrow.today .ptext` 当前被 `.payrow.today .ptext, .payrow.today .pay-mname { color: var(--cream); }` 覆盖为奶白色。新 class `.payday-today-text` 用更高优先级覆盖回红色。

---

## 问题3：发薪日当天弹窗

### 文件：`app/page.tsx`

**改动 1**：加 state 控制发薪日弹窗：

```tsx
const [showPaydayAlert, setShowPaydayAlert] = useState(false)

useEffect(() => {
  if (ledger.hydrated && ledger.members.length > 0) {
    const today = new Date().getDate()
    const isAnyPayday = ledger.members.some((m) => m.payday === today)
    if (isAnyPayday) {
      // 用 sessionStorage 防止同一天内反复弹窗（每次刷新只弹一次）
      const todayKey = `payday-alerted-${new Date().toDateString()}`
      if (!sessionStorage.getItem(todayKey)) {
        setShowPaydayAlert(true)
        sessionStorage.setItem(todayKey, "1")
      }
    }
  }
}, [ledger.hydrated, ledger.members])
```

**改动 2**：在 JSX 末尾（`<Toast />` 前面）加弹窗：

```tsx
{showPaydayAlert && (
  <div className="sheet-mask show" onClick={() => setShowPaydayAlert(false)} />
)}
{showPaydayAlert && (
  <div className="sheet show payday-alert-sheet" role="alertdialog" aria-label="发薪日提醒">
    <div className="payday-alert-emoji">🎉</div>
    <div className="payday-alert-title">今天是发薪日</div>
    <div className="payday-alert-text">记得存一笔哦！</div>
    <div className="payday-alert-btns">
      <button className="px-btn solid" onClick={() => {
        setShowPaydayAlert(false)
        ledger.openRecord()
      }}>马上记一笔</button>
      <button className="px-btn ghost" onClick={() => setShowPaydayAlert(false)}>知道了</button>
    </div>
  </div>
)}
```

### 文件：`components/styles/ledger.css`

新增发薪日弹窗样式：

```css
.app .payday-alert-sheet { padding: 28px 24px; text-align: center; max-width: 320px; }
.app .payday-alert-emoji { font-size: 48px; margin-bottom: 12px; }
.app .payday-alert-title { font-family: var(--font-pixel-cjk), monospace; font-size: 18px; font-weight: 700; color: var(--ink); margin-bottom: 6px; }
.app .payday-alert-text { font-size: 13px; color: var(--text-sub); margin-bottom: 20px; }
.app .payday-alert-btns { display: flex; flex-direction: column; gap: 10px; }
.app .payday-alert-btns .px-btn { width: 100%; }
```

---

## 问题4：新增存钱后恭喜弹窗

### 文件：`hooks/useLedger.ts`

**改动 1**：加恭喜弹窗 state：

```tsx
const [celebrateOpen, setCelebrateOpen] = useState(false)
const [celebrateMsg, setCelebrateMsg] = useState("")
```

**改动 2**：在 `saveUpdateGoal`（约 475 行）成功后触发恭喜弹窗。找到第 510-511 行：

```tsx
    setUpdateGoalId(null)
    toast("进度已更新")
```

改为：

```tsx
    setUpdateGoalId(null)
    // 触发恭喜弹窗
    const msgs = generateCelebrateMessages(num, newCurrent, updateGoal.target)
    setCelebrateMsg(msgs)
    setCelebrateOpen(true)
```

**改动 3**：新增恭喜文案生成函数（放在 `useLedger` 外部，文件顶部）：

```tsx
function generateCelebrateMessages(amount: number, current: number, target: number): string {
  const pct = Math.min(100, Math.round((current / target) * 100))
  const isComplete = current >= target

  // 大额存入（>1000）
  const bigAmountMsgs = [
    `哇！¥${amount} 这笔太给力了，离目标又近一大步 🚀`,
    `¥${amount} 入账！这存钱速度，今年稳了 💪`,
    `大额存入 ¥${amount}！你这是要提前完成目标啊 🎯`,
  ]
  // 中额存入（100-1000）
  const midAmountMsgs = [
    `又存了 ¥${amount}，积少成多，未来可期 ✨`,
    `¥${amount} 到账！每一笔都在为梦想添砖加瓦 🧱`,
    `稳扎稳打 ¥${amount}，这节奏很可以 📈`,
  ]
  // 小额存入（<100）
  const smallAmountMsgs = [
    `¥${amount} 也是爱！坚持就是胜利 🌱`,
    `小钱也是钱，¥${amount} 已存入，继续加油 💰`,
    `哪怕 ¥${amount}，也在向目标前进 🐾`,
  ]
  // 完成目标
  const completeMsgs = [
    `🎉 恭喜！「目标」已达成！太棒了！`,
    `🏆 目标完成！你的坚持终于开花结果！`,
    `🎊 100% 达成！这一刻值得庆祝！开瓶香槟吧！`,
  ]

  if (isComplete) return completeMsgs[Math.floor(Math.random() * completeMsgs.length)]
  if (amount >= 1000) return bigAmountMsgs[Math.floor(Math.random() * bigAmountMsgs.length)]
  if (amount >= 100) return midAmountMsgs[Math.floor(Math.random() * midAmountMsgs.length)]
  return smallAmountMsgs[Math.floor(Math.random() * smallAmountMsgs.length)]
}
```

**改动 4**：返回对象加 `celebrateOpen`、`celebrateMsg`、`setCelebrateOpen`。

### 文件：`app/page.tsx`

在发薪日弹窗后面加恭喜弹窗：

```tsx
{ledger.celebrateOpen && (
  <>
    <div className="sheet-mask show" onClick={() => ledger.setCelebrateOpen(false)} />
    <div className="sheet show celebrate-sheet" role="alertdialog" aria-label="恭喜">
      <div className="celebrate-emoji">🎊</div>
      <div className="celebrate-msg">{ledger.celebrateMsg}</div>
      <button className="px-btn solid" onClick={() => ledger.setCelebrateOpen(false)}>继续加油</button>
    </div>
  </>
)}
```

### 文件：`components/styles/ledger.css`

新增恭喜弹窗样式：

```css
.app .celebrate-sheet { padding: 32px 24px; text-align: center; max-width: 320px; }
.app .celebrate-emoji { font-size: 56px; margin-bottom: 16px; animation: celebrate-bounce .6s ease; }
.app .celebrate-msg { font-family: var(--font-pixel-cjk), monospace; font-size: 15px; font-weight: 600; color: var(--ink); line-height: 1.5; margin-bottom: 24px; }
.app .celebrate-sheet .px-btn { width: 100%; }

@keyframes celebrate-bounce {
  0% { transform: scale(0) rotate(-20deg); }
  50% { transform: scale(1.3) rotate(10deg); }
  100% { transform: scale(1) rotate(0); }
}
```

---

## 问题5：成员管理最多 2 名

### 文件1：`components/modals/MemberPage.tsx`

当前第 66 行「+ 新增」按钮始终显示，无数量限制。

**改动**：当已有 2 名成员时隐藏「+ 新增」按钮。找到第 66 行：

```tsx
<button className="fp-action" onClick={addMember}>+ 新增</button>
```

改为：

```tsx
{members.length < 2 && (
  <button className="fp-action" onClick={addMember}>+ 新增</button>
)}
```

### 文件2：`hooks/useLedger.ts`

**改动**：`addMember` 函数（约 552 行）加防御性检查，防止通过其他途径（如直接调用）突破 2 人上限。

找到第 552 行：

```tsx
const addMember = useCallback(() => {
  const id = `m_${Date.now()}`
  const defaultName = members.length === 0 ? "我" : `成员${members.length + 1}`
  // ...
```

改为：

```tsx
const addMember = useCallback(() => {
  if (members.length >= 2) {
    toast("最多只能添加 2 名成员哦")
    return
  }
  const id = `m_${Date.now()}`
  const defaultName = members.length === 0 ? "我" : `成员${members.length + 1}`
  // ...
```

依赖数组加 `members.length`：

```tsx
}, [members, patch, toast])
```

（原本依赖 `members` 和 `patch` 和 `toast`，`members.length` 已包含在 `members` 中，无需额外加。）

---

## 验收标准

1. 存钱更新历史每行有「编辑」「删除」按钮
2. 点编辑后该行变成输入框（金额 + 备注），点 ✓ 保存，✕ 取消
3. 点删除弹出 confirm 确认框，确认后删除该条历史，存钱总额自动重算
4. 编辑/删除历史后，存钱卡片的 current 金额自动更新
5. 发薪日当天，首页成员收支区显示「今天是发薪日，记得存一笔哦！」红色加粗
6. 发薪日当天首次进入首页，弹出 🎉 弹窗「今天是发薪日，记得存一笔哦！」，有「马上记一笔」和「知道了」两个按钮
7. 同一天内刷新页面不会重复弹发薪日弹窗（sessionStorage 控制）
8. 每次成功新增存钱进度后，弹出 🎊 恭喜弹窗，文案随机：
   - 大额（≥1000）：激励型文案
   - 中额（100-999）：鼓励型文案
   - 小额（<100）：温馨型文案
   - 完成目标：庆祝型文案
9. 成员管理最多只能添加 2 名成员，已有 2 名时隐藏「+ 新增」按钮
10. `npm run build` 通过
