# 记账App项目 - 长期记忆

## 项目定位
情侣记账App，像素复古风UI，默认成员"小五 & 小云"

## 技术栈
- Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn/ui
- Recharts（图表）+ xlsx（导入解析）
- 纯localStorage存储，无后端
- v0.app生成

## 关键架构
- hooks/useLedger.ts: 核心hook（600行），所有状态和业务逻辑
- lib/types.ts: 类型定义（Member/Transaction/Goal/Category/AppState）
- lib/storage.ts: localStorage读写+数据迁移
- components/tabs/: 4个Tab组件
- components/modals/: 5个弹窗
- components/styles/ledger.css: 像素风核心样式

## 已知问题（截至2026-06-26）
- 导出xlsx假的，导入只解析不写入
- 记账提醒无实际逻辑，发薪日不能真正修改
- 无删除账单功能，记账只能记当天
- 复盘缺年份显示
- useLedger.ts过大（600行）
- globals.css与ledger.css有--accent变量冲突
- MemberPage.tsx有重复prop
- 无PWA配置/数据同步/认证

## 用户偏好
- 不设预算对比、不做推送提醒（已拍板）
- PWA项目：原生HTML/CSS/JS优先（但当前项目已用Next.js）
