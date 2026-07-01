# Cursor 修复指令

> 先读 `HANDOFF.md` 了解项目背景。本轮基于优化 12–18 已部署后的线上反馈，修复 2 个问题。修改完成后运行完整测试。

---

## 问题 1：成员管理编辑界面头像性别分类错误

### 根因
`lib/constants.ts` 中 `SYS_AVATARS_FEMALE` / `SYS_AVATARS_MALE` 按文件名奇偶数分组，但 `/public/sys-av-*.png` 实际视觉性别与分组不一致，导致成员编辑页选择「女」时显示男性头像、选择「男」时显示女性头像。

### 需要修改的文件

#### 1.1 `lib/constants.ts`

根据实际图片视觉性别重新分组（已人工核对）：

```ts
// 女性头像：1、3、5、6、8
export const SYS_AVATARS_FEMALE = [
  "/sys-av-1.png",
  "/sys-av-3.png",
  "/sys-av-5.png",
  "/sys-av-6.png",
  "/sys-av-8.png",
]

// 男性头像：2、4、7、9、10
export const SYS_AVATARS_MALE = [
  "/sys-av-2.png",
  "/sys-av-4.png",
  "/sys-av-7.png",
  "/sys-av-9.png",
  "/sys-av-10.png",
]
```

同时修正默认成员头像：

```ts
export const DEFAULT_MEMBERS: Member[] = [
  { id: "wu", name: "小五", avatar: "/sys-av-1.png", gender: "female", payday: 10 },
  { id: "yun", name: "小云", avatar: "/sys-av-2.png", gender: "male", payday: 10 },
]
```

#### 1.2 `hooks/useLedger.ts`

将 `addMember` 中默认头像从 `SYS_AVATARS` 改为按性别使用分组数组：

- 第 1 个成员默认 `gender: "female"`，头像 `SYS_AVATARS_FEMALE[0]`
- 第 2 个成员默认 `gender: "male"`，头像 `SYS_AVATARS_MALE[0]`
- 导入改为 `import { SYS_AVATARS_FEMALE, SYS_AVATARS_MALE, INIT_CATS } from "@/lib/constants"`

修改后代码示例：

```ts
const addMember = useCallback(() => {
  if (members.length >= 2) {
    toast("最多只能添加 2 名成员哦")
    return
  }
  const id = `m_${Date.now()}`
  const isFirst = members.length === 0
  const defaultName = isFirst ? "我" : "成员2"
  const gender = isFirst ? "female" : "male"
  const avatar = isFirst ? SYS_AVATARS_FEMALE[0] : SYS_AVATARS_MALE[0]
  patch({
    members: [
      ...members,
      { id, name: defaultName, avatar, gender, payday: 10 },
    ],
  })
  toast("已添加新成员")
}, [members, patch, toast])
```

#### 1.3 `components/modals/MemberPage.tsx`（可选，如需要增强体验）

- 性别切换时，若当前头像不在新性别池内，自动切换到新池第 1 个头像（当前逻辑是清空，已可接受，不必改）。
- 确保 UI 上女性/男性头像分组与 `lib/constants.ts` 一致即可。

---

## 问题 2：PWA 桌面图标启动慢，图片加载慢

### 根因
`public/sw.js` 只缓存了 manifest 和应用图标，没缓存底部导航栏 `/tabbar/*.png`、系统头像 `/sys-av-*.png`、RoomSetup 角色图 `/avatars/*.jpg`。桌面启动时这些图片要走网络，导致首屏慢。

### 需要修改的文件

#### 2.1 `public/sw.js`

升级缓存版本号，扩展 `LOCAL_ASSETS` 列表：

```js
const CACHE_NAME = "couple-ledger-v30"

const LOCAL_ASSETS = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png",
  // 底部导航栏图标
  "./tabbar/home.png",
  "./tabbar/home-active.png",
  "./tabbar/flow.png",
  "./tabbar/flow-active.png",
  "./tabbar/record.png",
  "./tabbar/record-active.png",
  "./tabbar/review.png",
  "./tabbar/review-active.png",
  "./tabbar/mine.png",
  "./tabbar/mine-active.png",
  // 系统头像
  "./sys-av-1.png",
  "./sys-av-2.png",
  "./sys-av-3.png",
  "./sys-av-4.png",
  "./sys-av-5.png",
  "./sys-av-6.png",
  "./sys-av-7.png",
  "./sys-av-8.png",
  "./sys-av-9.png",
  "./sys-av-10.png",
  // RoomSetup 角色图
  "./avatars/girl.jpg",
  "./avatars/boy.jpg",
]
```

保持以下策略不变：

- `/_next/*` 不缓存（避免 JS 版本不匹配导致刷新白屏）
- `/api/*` 不缓存
- 缓存策略：cache-first（`caches.match` 优先，未命中再 fetch）

#### 2.2 `app/layout.tsx`（可选优化）

如有必要，可为关键图片添加 `<link rel="preload">`：

```tsx
export const metadata: Metadata = {
  // ... 已有配置
  other: {
    "link": [
      { rel: "preload", href: "/tabbar/home-active.png", as: "image" },
      { rel: "preload", href: "/sys-av-1.png", as: "image" },
      { rel: "preload", href: "/sys-av-2.png", as: "image" },
    ].map((l) => l as unknown as string),
  },
}
```

但优先级不如 SW 缓存高，**先以修改 `public/sw.js` 为主**。

---

## 测试 checklist

完成上述修改后，必须执行：

1. `npm run build` —— 确保 TypeScript 与构建通过
2. `npm test` —— 35 个单元测试全部通过
3. `npm run dev` 启动后访问 `http://127.0.0.1:3006`
   - 进入「我的 → 成员管理 → 编辑」
   - 切换性别，确认女性/男性头像分组正确
   - 新增成员，确认默认头像与性别对应
4. 生产构建测试 SW 缓存：
   - `npm run build && npm run start`
   - 用 Chrome 访问生产端口，DevTools → Application → Service Workers → 查看缓存资源包含 tabbar/avatars/sys-av
   - 离线模式下刷新，确认 tabbar 图标和头像仍能显示
5. 如环境允许，运行 Supabase 真实集成测试（或至少验证 `npm run build` + `npm run start` 首页正常）

---

## 注意事项

- 不要修改图片文件本身，只改常量分组。
- `SYS_AVATARS` 已标记 `@deprecated`，不要新增使用处。
- 完成修复后更新 `HANDOFF.md`：
  - 将「新发现待修复问题」标记为 ✅ 已修复
  - 更新 `npm run build` + `npm test` 验证时间
  - 在「最近 commit 记录」补充本次修复 commit
