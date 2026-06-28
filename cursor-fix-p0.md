# Cursor 修复命令 — 按文件顺序执行

项目路径：~/Documents/记账app/-pwav1-移植版

---

## 1. lib/storage.ts — roomId 不同步（P0）

```
修改 lib/storage.ts 的 parseState 函数（约41行），加上 roomId 字段：

function parseState(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState> & { goals?: StoredGoal[] }
  const defaults = createDefaultState()
  return {
    transactions: parsed.transactions || [],
    members: parsed.members?.length ? parsed.members : defaults.members,
    goals: (parsed.goals || []).map(migrateGoal),
    activeGoalId: parsed.activeGoalId ?? null,
    cats: mergeCats(parsed.cats?.length ? parsed.cats : defaults.cats),
    theme: parsed.theme || defaults.theme,
    coupleBg: parsed.coupleBg || "",
    startDate: parsed.startDate || defaults.startDate,
    remindOn: parsed.remindOn ?? true,
    importBatches: parsed.importBatches || [],
    roomId: parsed.roomId || localStorage.getItem("couple-room-id") || "",
  }
}
```

---

## 2. components/modals/RecordSheet.tsx — 金额输入不进去（P0）

```
修改 RecordSheet.tsx：
去掉 <input type="number">，只用计算键盘输入金额。
确保 value 显示与 state 严格同步，不要出现双机制冲突。
```

---

## 3. components/modals/GoalSheet.tsx — 目标名称空格bug（P0）

```
修改 GoalSheet.tsx 第109行附近：
把 .trimStart() 从 onChange 移到 onSubmit，只在提交时去空格。
或者在 onChange 里用 v.replace(/^\s+/, "") 只去掉开头空格，不干扰中间空格和中文输入。
```

---

## 4. components/tabs/MineTab.tsx — 导入不支持CSV（P0）

```
修改 MineTab.tsx 第154行附近：
把 file input 的 accept 属性从 accept=".xlsx,.xls" 改为 accept=".xlsx,.xls,.csv,text/csv"
```

---

## 5. components/tabs/HomeTab.tsx — m1 未定义（P0）

```
修改 HomeTab.tsx：
在组件函数开头，members 解构后加上 const m1 = members[1]
或者把第72行引用的 m1 替换为 members[1]?.name ?? "成员2"
```

---

## 6. lib/storage.ts — pushToCloud 先删后插风险（P0）

```
修改 lib/storage.ts 的 pushToCloud 函数（约97-160行）：
把先删后插的策略改为 upsert（有则更新，无则插入），不先删数据。
```

---

## 7. public/js/income-watch.js — 硬编码 memberId（P0）

```
修改 public/js/income-watch.js：
把硬编码的 memberId: "wu" 改为动态获取，或者移除硬编码。
```

---

## 完成所有 P0 后告诉我，再来修 P1 和 P2
