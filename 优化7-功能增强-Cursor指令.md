# 优化7：功能增强 + UI 微调（5 项）

## 问题1：账单导入后可删除项目 + 重复导入提醒

### 1a. 导入预览页加删除功能

#### 文件：`components/modals/ImportPreviewSheet.tsx`

当前每行只有「日期/金额/分类/商品说明」4 列，没有删除操作。

**改动 1**：表头加一列「操作」：
```tsx
<tr>
  <th>日期</th>
  <th>金额</th>
  <th>分类</th>
  <th>商品说明</th>
  <th>操作</th>
</tr>
```

**改动 2**：每行末尾加删除按钮：
```tsx
<td className="import-preview-note" title={t.note}>
  {t.note || "—"}
</td>
<td className="import-preview-action">
  <button
    type="button"
    className="import-preview-del"
    aria-label="删除此行"
    onClick={() => removeRow(t.id)}
  >
    ✕
  </button>
</td>
```

**改动 3**：在 `handleConfirmClick` 上方加 `removeRow` 函数：
```tsx
function removeRow(id: string) {
  setRows((prev) => prev.filter((t) => t.id !== id))
}
```

**改动 4**：底部确认按钮的条数用 `rows.length`（删除后会变少），当前已经是 `{rows.length} 条`，无需改。

**改动 5**：空列表处理。当 `rows.length === 0` 时，表格区域显示提示：
```tsx
{rows.length === 0 ? (
  <div className="import-preview-empty">已删除所有项目，可点击取消退出</div>
) : (
  <table className="import-preview-table">...</table>
)}
```

### 1b. 重复导入同一份文件提醒

#### 文件：`hooks/useLedger.ts`

**思路**：用「文件名 + 文件大小 + 最后修改时间」做指纹，存到 localStorage。下次导入时检查指纹是否已存在。

**改动 1**：在 `onImportFile` 函数开头（第 700 行 `if (!file) return` 之后），加重复检测：

```tsx
const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // === 重复导入检测 ===
  const fileFingerprint = `${file.name}|${file.size}|${file.lastModified}`
  const importedFingerprints = JSON.parse(localStorage.getItem("imported-files") || "[]") as string[]
  if (importedFingerprints.includes(fileFingerprint)) {
    toast("⚠️ 请勿导入重复账单！")
    e.target.value = ""
    return
  }

  const memberId = members[0]?.id || "wu"
  // ... 后续代码不变
```

**改动 2**：在 `confirmImportPreview` 函数中，导入成功后记录指纹。找到 `confirmImportPreview`（约 621 行），在 `toast(...)` 之前加：

```tsx
const confirmImportPreview = useCallback((imported: Transaction[]) => {
  // ... 现有代码 ...

  // 记录已导入文件指纹
  if (importPreviewFileFingerprint) {
    const importedFingerprints = JSON.parse(localStorage.getItem("imported-files") || "[]") as string[]
    importedFingerprints.push(importPreviewFileFingerprint)
    // 只保留最近 50 条指纹，防止 localStorage 膨胀
    if (importedFingerprints.length > 50) importedFingerprints.shift()
    localStorage.setItem("imported-files", JSON.stringify(importedFingerprints))
  }

  toast(`✅ 已导入 ${imported.length} 条${sourceLabel}账单`)
  cancelImportPreview()
}, [importPreviewSource, importPreviewRecorder, importPreviewFileFingerprint, cancelImportPreview, toast])
```

**改动 3**：新增 state 存文件指纹。在 `importPreviewRecorder` state 旁加：
```tsx
const [importPreviewFileFingerprint, setImportPreviewFileFingerprint] = useState("")
```

**改动 4**：`openImportPreview` 接收指纹参数：
```tsx
const openImportPreview = useCallback((result: ImportResult, recorder: string, fileFingerprint: string) => {
  // ... 现有代码 ...
  setImportPreviewFileFingerprint(fileFingerprint)
}, [...])
```

**改动 5**：`onImportFile` 中调用 `openImportPreview` 时传入指纹：
```tsx
openImportPreview(result, memberId, fileFingerprint)
```
（3 处调用都要加第 3 个参数）

**改动 6**：把 `importPreviewFileFingerprint` 加入返回对象（约 950 行附近）。

---

## 问题2：导入前先选择成员

### 文件：`components/tabs/MineTab.tsx`

当前点「导入账单」直接触发 `fileRef.current?.click()`，默认用 `members[0]`。

**改动**：点击「导入账单」先弹成员选择弹窗，选完再触发文件选择。

**改动 1**：加 state 控制成员选择弹窗：
```tsx
const [confirmSwitch, setConfirmSwitch] = useState(false)
const [importMemberPicker, setImportMemberPicker] = useState(false)
const [pendingImportAction, setPendingImportAction] = useState<"import" | "export">("import")
```

**改动 2**：导入按钮改为打开弹窗：
```tsx
<button className="setrow" onClick={() => {
  setPendingImportAction("import")
  setImportMemberPicker(true)
}}>
  <span className="set-ico s8">入</span><span className="set-label">导入账单</span>
  <span className="set-val">csv / xlsx</span><span className="set-arrow">›</span>
</button>
```

**改动 3**：导出按钮同样改为打开弹窗：
```tsx
<button className="setrow" onClick={() => {
  setPendingImportAction("export")
  setImportMemberPicker(true)
}}>
  <span className="set-ico s6">出</span><span className="set-label">导出账单</span>
  <span className="set-val">.xlsx</span><span className="set-arrow">›</span>
</button>
```

**改动 4**：新增成员选择弹窗 JSX（放在换房间确认弹窗后面）：
```tsx
{importMemberPicker && (
  <>
    <div className="sheet-mask show" onClick={() => setImportMemberPicker(false)} />
    <div className="sheet show" style={{ padding: 20, textAlign: "center" }}>
      <div className="sheet-title">选择{pendingImportAction === "import" ? "导入" : "导出"}的成员</div>
      <p style={{ fontSize: 11, color: "var(--text-sub)", margin: "8px 0 16px" }}>
        账单将{pendingImportAction === "import" ? "归入" : "导出"}所选成员名下
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {members.map((m) => (
          <button
            key={m.id}
            className="px-btn ghost"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={() => {
              setImportMemberPicker(false)
              if (pendingImportAction === "import") {
                onSelectImportMember(m.id)
              } else {
                onSelectExportMember(m.id)
              }
            }}
          >
            <img className="pixavatar" src={m.avatar || "/placeholder.svg"} alt={m.name} style={{ width: 24, height: 24 }} />
            {m.name}
          </button>
        ))}
      </div>
    </div>
  </>
)}
```

**改动 5**：`MineTab` 的 props 加两个回调：
```tsx
export function MineTab({
  ledger,
  onSelectImportMember,
  onSelectExportMember,
}: {
  ledger: Pick<Ledger, ...>  // 现有不变
  onSelectImportMember: (memberId: string) => void
  onSelectExportMember: (memberId: string) => void
})
```

### 文件：`hooks/useLedger.ts`

**改动 1**：`onImportFile` 改为接收 `memberId` 参数：
```tsx
const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>, memberId?: string) => {
  const file = e.target.files?.[0]
  if (!file) return
  const actualMemberId = memberId || members[0]?.id || "wu"
  // ... 后续用 actualMemberId 替代 memberId
```

**改动 2**：新增 `onSelectImportMember` 和 `onSelectExportMember`：
```tsx
const onSelectImportMember = useCallback((memberId: string) => {
  // 设置待导入成员，触发文件选择
  pendingImportMemberRef.current = memberId
  fileRef.current?.click()
}, [])

const onSelectExportMember = useCallback((memberId: string) => {
  exportTransactionsXlsx(memberId)
}, [exportTransactionsXlsx])
```

**改动 3**：`onImportFile` 读取 `pendingImportMemberRef`：
```tsx
const pendingImportMemberRef = useRef<string>("")

const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  const memberId = pendingImportMemberRef.current || members[0]?.id || "wu"
  pendingImportMemberRef.current = ""  // 用完清空
  // ...
```

**改动 4**：`exportTransactionsXlsx` 改为可选接收 `memberId`：
```tsx
const exportTransactionsXlsx = useCallback((memberId?: string) => {
  const targetMemberId = memberId || members[0]?.id || ""
  // 导出时按 targetMemberId 过滤交易
  // ... 现有导出逻辑，加 memberId 过滤
}, [members, transactions, toast])
```

**改动 5**：返回对象加 `onSelectImportMember`、`onSelectExportMember`。

### 文件：`components/page.tsx`（或主页面）

把 `onSelectImportMember` 和 `onSelectExportMember` 传给 `MineTab`。

---

## 问题3：存钱卡片字体调整

### 文件：`components/styles/ledger.css`

**当前状态**（约 601-635 行）：
- `.goal-card-hint`（还差xx，xx%）：9px，有描边
- `.goal-card-amt`（¥xxx/¥xxx）：11px，有描边

### 改动

**① `.goal-card-hint`**：字体放大 15%（9px × 1.15 ≈ 10.35px，取 10px），保留描边：
```css
.app .goal-card-hint {
  font-size: 10px;
  color: rgba(255,255,255,.9);
  margin-top: 2px;
  text-shadow:
    -1px -1px 0 #000,
     1px -1px 0 #000,
    -1px  1px 0 #000,
     1px  1px 0 #000,
    -1px  0   0 #000,
     1px  0   0 #000,
     0   -1px 0 #000,
     0    1px 0 #000;
}
```

**② `.goal-card-amt`**：取消描边，改为阴影效果：
```css
.app .goal-card-amt {
  font-family: var(--font-pixel), monospace;
  font-size: 11px;
  color: #FFFFFF;
  margin-top: 4px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}
.app .goal-card-amt .cur { color: #FFFFFF; }
.app .goal-card-amt .tgt {
  color: rgba(255,255,255,.7);
  text-shadow: none;
}
```

---

## 问题4：底部导航栏四个图标水平对齐

### 文件：`components/styles/ledger.css`

当前 `.tab` 是 `flex: 1` 均分，`.tab.center` 是 `flex: 0 0 auto`。问题可能是 4 个图标不在同一水平线上（因为中间 record 没有文字标签，高度不一致）。

### 改动

找到 `.tabbar` 和 `.tab` 样式（约 293-302 行），调整：

```css
/* Tab 栏 - 确保四个图标水平对齐 */
.app .tabbar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: var(--card); border-top: 4px solid var(--ink); display: flex; align-items: flex-end; padding: 8px 6px calc(8px + env(safe-area-inset-bottom)); z-index: 60; }
.app .tab { flex: 1; background: none; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 4px; color: var(--text-sub); font-family: var(--font-pixel-cjk), monospace; font-size: 10px; transition: transform .08s steps(2); padding: 2px 0; min-height: 56px; }
.app .tab .t-img { width: 30px; height: 30px; image-rendering: pixelated; transition: transform .12s steps(2); }
.app .tab.active { color: var(--accent-dark); }
.app .tab.active .t-img { transform: translateY(-1px) scale(1.08); }
.app .tab:active { transform: translateY(2px); }
.app .tab.center { flex: 0 0 auto; min-height: 56px; justify-content: center; }
.app .tab.center .plus { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; transition: transform .08s steps(2); overflow: hidden; }
.app .tab.center .plus .record-img { width: 44px; height: 44px; image-rendering: pixelated; }
.app .tab.center:active .plus { transform: translateY(2px); }
```

关键改动：
- `.tabbar` 的 `align-items: center` → `align-items: flex-end`（底部对齐）
- `.tab` 加 `min-height: 56px`（统一最小高度）+ `justify-content: flex-start`
- `.tab.center` 加 `min-height: 56px` + `justify-content: center`

这样 4 个普通 tab 的图标都在顶部对齐，中间 record 图标垂直居中，底部全部对齐。

---

## 问题5：我的界面顶部模块调整

### 文件：`components/tabs/MineTab.tsx`

**当前结构**（约 81-98 行）：
```tsx
<div className="couple-inner couple-inner-new">
  <div className="couple-left">
    <div className="couple-avatars-new">
      {members.map((m, i) => (
        <span key={m.id} className="couple-av-item">
          <img className="pixavatar couple-av" src={m.avatar || "/placeholder.svg"} alt={m.name} />
          {i === 0 && members.length >= 2 && <span className="couple-heart" aria-hidden="true">♥</span>}
        </span>
      ))}
    </div>
    <div className="couple-names-row">{members.map((m) => m.name).join(" & ")}</div>
  </div>
  <div className="couple-right">
    <div className="couple-days-label">一起记账的</div>
    <div className="couple-days-num">{coupleDays}</div>
    <div className="couple-days-unit">天啦</div>
  </div>
</div>
```

### 改动 1：名字分别显示在各头像正下方

```tsx
<div className="couple-inner couple-inner-new">
  <div className="couple-left">
    <div className="couple-avatars-new">
      {members.map((m, i) => (
        <span key={m.id} className="couple-av-item">
          <img className="pixavatar couple-av" src={m.avatar || "/placeholder.svg"} alt={m.name} />
          {i === 0 && members.length >= 2 && <span className="couple-heart" aria-hidden="true">♥</span>}
          <span className="couple-av-name">{m.name}</span>
        </span>
      ))}
    </div>
  </div>
  <div className="couple-right">
    <div className="couple-days-oneline">
      <span className="couple-days-label">开始记账</span>
      <span className="couple-days-num">{coupleDays}</span>
      <span className="couple-days-unit">天啦</span>
    </div>
  </div>
</div>
```

改动点：
- 删除 `<div className="couple-names-row">` 整行
- 每个 `couple-av-item` 内加 `<span className="couple-av-name">{m.name}</span>`
- 右侧三行改为一行：`couple-days-oneline` 包裹三个 span
- 文案「一起记账的」→「开始记账」

### 文件：`components/styles/ledger.css`

**改动 1**：`.couple-av-item` 改为纵向布局（头像在上，名字在下）：
```css
.app .couple-av-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
```

**改动 2**：新增 `.couple-av-name`：
```css
.app .couple-av-name { font-family: var(--font-pixel-cjk), monospace; font-size: 11px; color: var(--cream); text-shadow: 1px 1px 0 rgba(0,0,0,.4); }
```

**改动 3**：删除 `.couple-names-row`（不再使用，可保留也可删）。

**改动 4**：右侧天数改为一行排版。找到 `.couple-days-label`、`.couple-days-num`、`.couple-days-unit`，改为：

```css
.app .couple-days-oneline { display: flex; align-items: baseline; gap: 4px; }
.app .couple-days-label { font-family: var(--font-pixel-cjk), monospace; font-size: 11px; color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,.5); }
.app .couple-days-num { font-family: var(--font-pixel), monospace; font-size: 52px; color: #FFD700; line-height: 1; text-shadow: 2px 2px 4px rgba(0,0,0,.5); font-weight: 700; }
.app .couple-days-unit { font-family: var(--font-pixel-cjk), monospace; font-size: 13px; color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,.5); }
```

关键改动：
- 新增 `.couple-days-oneline` flex 一行布局 + `align-items: baseline` 让数字和文字底部对齐
- 颜色从 `var(--out)` 改为 `#FFD700`（金黄色）
- 数字从 42px 放大到 52px
- 文字从 10px/11px 调整为 11px/13px
- 阴影从 `text-shadow: 3px 3px 0 rgba(0,0,0,.25)` 改为 `2px 2px 4px rgba(0,0,0,.5)`（更柔和的投影）

**改动 5**：`.couple-right` 保持 `text-align: right`，但如果一行排不下可以改 `text-align: center`。建议保持 right，flex 会自动处理。

---

## 验收标准

1. 导入预览页每行有删除按钮（✕），点击后该行从列表移除，底部条数自动更新
2. 重复导入同一份文件时弹出 toast「⚠️ 请勿导入重复账单！」并阻止导入
3. 点「导入账单」先弹成员选择弹窗，选完成员再触发文件选择；导入的账单归入选定成员
4. 点「导出账单」先弹成员选择弹窗，导出该成员名下的交易
5. 存钱卡片：「还差xx，xx%」字体放大到 10px 保留描边；「¥xxx/¥xxx」取消描边改阴影
6. 底部导航栏 4 个普通图标顶部水平对齐，间距相同，中间记账按钮垂直居中
7. 我的界面：两个头像下方各自显示名字；右侧「开始记账 x 天啦」一行排版，数字放大，金黄色 + 阴影
8. `npm run build` 通过
