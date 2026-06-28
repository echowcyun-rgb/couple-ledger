# 情侣记账 PWA - Cursor 修复提示词

项目路径：`~/Documents/记账app/-pwav1-移植版`
技术栈：Next.js 16 + TypeScript + Supabase

请按以下顺序修复。每修完一个告诉我。

---

## 第一批：P0 级（7 个，必须修）

### 1. parseState 补上 roomId

**文件：** `lib/storage.ts`

`parseState()` 函数（~第41-56行）漏了 roomId，导致每次从 localStorage 读数据时 roomId 变空字符串。

**修复：** 在 `parseState` 的 return 对象中加一行：
```
roomId: parsed.roomId || localStorage.getItem("couple-room-id") || "",
```

---

### 2. 金额输入只保留一种方式

**文件：** `components/modals/RecordSheet.tsx`

目前金额输入有双机制冲突（`<input type="number">` + `tapKey` 计算键盘），互相覆盖。

**修复：**
- 删掉 `<input type="number">` 那一段（约第130-150行，`金额` 那个 field）
- 顶部大号金额显示保留（`<div className="rec-amount">` 那段）
- 计算器数字键盘保留（如果存在的话）

---

### 3. 目标名称输入去掉 trimStart

**文件：** `components/modals/GoalSheet.tsx` 第109行

**修复：** 把 `.replace(/\s+/g, " ").trimStart()` 改为 `.replace(/^\s+/, "")`（只禁止前导空格，不干涉中间输入）

---

### 4. 导入账单 accept 加 .csv

**文件：** `components/tabs/MineTab.tsx` 第154行

**修复：** 把 `accept=".xlsx,.xls"` 改为 `accept=".xlsx,.xls,.csv"`

---

### 5. HomeTab 补 m1 变量

**文件：** `components/tabs/HomeTab.tsx` 第24行附近

**修复：** 在 `const m0 = members[0]` 后面加一行：
```
const m1 = members[1]
```

---

### 6. pushToCloud 改为 upsert（不先删后插）

**文件：** `lib/storage.ts`

**修复：**
- members 推送：删除 `delErr` 那段删除逻辑，直接 `upsert` 每个 member（用 onConflict: "id"）
- goals 推送：同样去掉先删的逻辑，用 `upsert` 替代
- 任何失败不要只 console.warn，应该 throw 让上层处理

---

### 7. income-watch.js 去掉硬编码 memberId

**文件：** `public/js/income-watch.js`

**修复：** 找到文件中硬编码的 `"wu"` 字符串，改为从 DOM/URL/localStorage 动态获取当前成员 ID

---

## 第二批：P1 级（5 个）

### 8. 流水页编辑按钮实现功能

**文件：** `components/tabs/FlowTab.tsx` 第138行

**修复：** 把 `{/* 编辑功能待接入弹窗 */}` 替换为实际功能：
- 点击编辑打开 RecordSheet，传入当前记录的 id、类型、金额、分类、经手人、备注、日期
- useLedger.ts 增加 editTransaction 回调或复用 saveRecord 的编辑模式

---

### 9. 分类管理重构

**文件：** `components/modals/CategorySheet.tsx`

**重构成：**
- 展示所有分类（默认 + 自定义），按类型分组：收入 / 支出 / 存钱
- 每个分类右侧有删除按钮（默认分类只能删除自定义的）
- 底部有新增区域（选择类型 + 输入名称 + 添加按钮）
- 保持现有弹窗样式

---

### 10. 成员管理界面自适应

**文件：** `components/modals/MemberPage.tsx`

**修复：** 
- 添加 `max-height: 80vh; overflow-y: auto` 让内容可滚动
- 用百分比/视口单位替代固定 px

---

### 11. 云同步失败给用户提示

**文件：** `lib/storage.ts` 和 `lib/supabase.ts`

**修复：**
- pushToCloud 失败时调用 `toast` 通知用户（需要把 toast 传入或使用事件）
- syncFromCloud 失败时显示 toast 而非假装没有数据
- 关键操作失败应 throw 而非只 warn

---

### 12. 统一字段映射为 snake_case

**文件：** `lib/storage.ts` 和 `lib/supabase.ts`

**修复：** 确保所有推送到 Supabase 的数据都使用 snake_case：
- `room_id`（已有）
- `category_key`
- `member_id`
- `created_at`

检查 `lib/supabase.ts` 中的 `pushTransaction` 和 `pushTransactions` 函数，确保数据中的字段名是 snake_case。

---

## 第三批：P2 级（9 个，可排期）

### 13. 锁定视口防止弹窗放大

**文件：** `app/layout.tsx`

viewport 配置加：
```
maximumScale: 1,
userScalable: false,
```

---

### 14. 存钱目标 emoji 输入框改为预设选择

**文件：** `components/modals/GoalSheet.tsx` 第98-104行

把 emoji 输入框替换为一组预设 emoji 按钮（如：🎯🏠🚗✈️🎓💰💍🌍📱💻）

---

### 15. 分类下拉加向下箭头

**文件：** `components/modals/RecordSheet.tsx` 和 `components/styles/ledger.css`

在 select 元素上加 CSS：`appearance: none` + 背景箭头图标

---

### 16. 手动更新存钱目标记录经手人

**文件：** `hooks/useLedger.ts` 第343行 和 `components/modals/UpdateGoalSheet.tsx`

- UpdateGoalSheet 添加经手人选择器
- saveUpdateGoal 的 history entry 加入 `memberId`

---

### 17. 补充 manifest.json

**新建：** `public/manifest.json`

```
{
  "name": "情侣记账",
  "short_name": "记账本",
  "description": "情侣一起记账",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#2B2440",
  "theme_color": "#2B2440",
  "icons": [{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

---

### 18. 按钮防重复点击

**文件：** 所有表单提交按钮（RecordSheet、GoalSheet、UpdateGoalSheet、CategorySheet、MemberPage）

在点击后 disabled，操作完成再恢复。

---

### 19. 弹窗添加下滑手势关闭

**文件：** `components/styles/ledger.css`

对 `.sheet` 添加触摸事件支持（可后续做，低优先级）

---

### 20. CSS touch-action

**文件：** `components/styles/ledger.css`

全局 `.app` 加 `touch-action: manipulation`

---

## 提交

改完后，在终端运行：
```bash
cd ~/Documents/记账app/-pwav1-移植版
git add .
git commit -m "fix: fix 21 bugs from code review (roomId, input, import, etc)"
git config http.version HTTP/1.1
git push
```
