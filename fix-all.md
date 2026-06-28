# 全部问题修复 + 新功能 — Cursor 命令

项目：~/Documents/记账app/-pwav1-移植版
执行顺序：按编号依次粘贴到 Cursor

---

## 1. 创建房间后清空旧数据

**文件：** `components/modals/RoomSetup.tsx`

在 `handleJoin` 函数中，`localStorage.setItem("couple-room-id", code)` **之前**加一行：
```tsx
localStorage.removeItem("couple-ledger-v1")
```

在 `handleStartUsing` 函数中，`localStorage.setItem("couple-room-id", createdRoom)` **之前**加同一行：
```tsx
localStorage.removeItem("couple-ledger-v1")
```

---

## 2. 导入账单 accept 加 .csv

**文件：** `components/tabs/MineTab.tsx` 第154行

确认 accept 为：
```tsx
accept=".xlsx,.xls,.csv"
```

如果已经是就不用改。

---

## 3. 分类名称验证 —— addCat 加前端预检

**文件：** `components/modals/CategorySheet.tsx`

修改 `handleAdd` 函数：
```tsx
function handleAdd() {
    if (adding) return
    const label = newCatLabel.trim()
    if (!label) { toast("请输入分类名称"); return }
    setAdding(true)
    addCat()
    setTimeout(() => setAdding(false), 500)
}
```

同时在 CategorySheet 的 Pick 类型中确认有 `"newCatLabel"` 和 `"addCat"`。

---

## 4. 存钱目标增加「预计达成时间」字段

### 4.1 数据类型加 deadline

**文件：** `lib/types.ts`

在 Goal 接口中增加 `deadline`：
```typescript
export interface Goal {
  id: number
  name: string
  emoji: string
  current: number
  target: number
  contributions: Record<string, number>
  history: GoalHistoryEntry[]
  deadline: string   // 格式 "2026-12-31"
}
```

### 4.2 存钱目标弹窗加日期输入

**文件：** `components/modals/GoalSheet.tsx`

在新增目标表单中，金额输入框**后面**加一个日期输入：
```tsx
<input
  className="ga-input"
  type="date"
  value={newGoalDeadline}
  onChange={(e) => setNewGoalDeadline(e.target.value)}
  style={{ marginTop: 8 }}
/>
```

在 GoalSheet 的 Pick 类型中增加 `"newGoalDeadline"` 和 `"setNewGoalDeadline"`。

### 4.3 useLedger 增加 deadline 状态

**文件：** `hooks/useLedger.ts`

在 state 定义区增加（约第66行附近）：
```tsx
const [newGoalDeadline, setNewGoalDeadline] = useState("")
```

修改 `addGoal` 函数，创建 goal 时带上 deadline：
```tsx
const goal: Goal = {
  id: Date.now(),
  name,
  emoji: newGoalEmoji || "★",
  current: 0,
  target,
  contributions: {},
  history: [],
  deadline: newGoalDeadline,
}
```

在 return 对象中增加 `newGoalDeadline` 和 `setNewGoalDeadline`。

### 4.4 storage 迁移函数处理 deadline

**文件：** `lib/storage.ts`

在 `migrateGoal` 函数中增加 deadline 字段：
```typescript
return {
    id: g.id!,
    name: g.name!,
    emoji: g.emoji || "★",
    current: g.current ?? 0,
    target: g.target!,
    contributions,
    history: (g.history || []).map(...),
    deadline: g.deadline || "",
}
```

在 `parseState` 中不需要额外改（Goal 接口会自动包含）。

---

## 5. 首页存钱目标改造

**目标：**
- 展示距离 deadline 最近的 3 个目标（按 deadline 升序，无 deadline 的排最后）
- 删除 VS 比赛模块
- 首页 Pick 类型从 `activeGoal` 改为 `goals`

### 5.1 修改 HomeTab

**文件：** `components/tabs/HomeTab.tsx`

**① 修改 Pick 类型：**
把 `| "activeGoal" | "pct" | "barWidth"` 替换为 `| "goals"`

同时解构处改为：
```tsx
const { members, currentMonth, goals, monthSummary, memberSummaries, today, setGoalOpen, openRecord } = ledger
```

删除 `m1` 相关行（第25行 `const m1 = members[1]` 可保留但不使用）。

**② 替换存钱大作战区块（第44-91行）为：**

```tsx
<div className="battle">
  <div className="battle-pattern" aria-hidden="true" />
  <div className="battle-inner">
    <div className="battle-head">
      <div className="battle-title">★ 存钱大作战</div>
      <button className="px-btn ghost sm" onClick={() => setGoalOpen(true)}>管理目标</button>
    </div>
    {goals.length > 0 ? (
      <div className="goal-cards">
        {goals
          .sort((a, b) => {
            // 有 deadline 的排前面，按日期升序
            if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
            if (a.deadline) return -1
            if (b.deadline) return 1
            return 0
          })
          .slice(0, 3)
          .map((g) => {
            const gp = Math.min(100, Math.round((g.current / g.target) * 100))
            const daysLeft = g.deadline
              ? Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : null
            return (
              <div className="goal-card" key={g.id}>
                <div className="goal-card-head">
                  <span className="goal-card-emoji">{g.emoji}</span>
                  <span className="goal-card-name">{g.name}</span>
                  {daysLeft !== null && (
                    <span className="goal-card-days">{daysLeft === 0 ? "今天截止！" : `还剩 ${daysLeft} 天`}</span>
                  )}
                </div>
                <div className="hpbar"><div className="hpfill" style={{ width: `${gp}%` }} /></div>
                <div className="goal-card-amt">
                  <span className="cur">¥{g.current.toLocaleString()}</span>
                  <span className="tgt">/ ¥{g.target.toLocaleString()}</span>
                </div>
              </div>
            )
          })}
      </div>
    ) : (
      <div className="no-goal">
        <div className="no-goal-txt">还没有存钱目标</div>
        <button className="px-btn solid sm" onClick={() => setGoalOpen(true)}>+ 新增目标</button>
      </div>
    )}
  </div>
</div>
```

**③ 删除 VS 比赛模块：**
HomeTab 中原来的以下代码已被上面替换删除：
- `getGoalContribution` 导入（第1行）— 如果其他地方没用到可以删掉
- `.players` / `VS` 相关的 HTML（原第62-82行）
- `m1` 变量如果不使用可以删掉

**④ 如果 `getGoalContribution` 不再使用，删除导入：**
```tsx
// 删除这行
import { getGoalContribution } from "@/lib/goals"
```

### 5.2 添加 CSS 样式

**文件：** `components/styles/ledger.css`

追加以下样式（放在文件末尾）：
```css
/* 首页多目标卡片 */
.goal-cards { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.goal-card { background: rgba(255,255,255,.08); border: 2px solid var(--ink); border-radius: 10px; padding: 12px; }
.goal-card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.goal-card-emoji { font-size: 18px; }
.goal-card-name { font-family: var(--font-pixel-cjk), monospace; font-size: 12px; color: var(--cream); flex: 1; }
.goal-card-days { font-family: var(--font-pixel), monospace; font-size: 9px; color: var(--orange); }
.goal-card-amt { font-family: var(--font-pixel), monospace; font-size: 11px; color: var(--cream); margin-top: 4px; }
.goal-card-amt .cur { color: var(--accent); }
.goal-card-amt .tgt { color: var(--text-sub); }
```

---

## 6. 修复完成

```bash
cd ~/Documents/记账app/-pwav1-移植版
git add .
git commit -m "fix: room data clear + goal deadline + home goals refactor"
git push
```
