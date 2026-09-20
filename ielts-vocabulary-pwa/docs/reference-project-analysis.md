# 参考项目分析

分析日期：2026-07-26  
分析方式：仅阅读本地 GitHub ZIP 源码快照；未修改、安装或构建五个参考目录。

## 总体结论

五个参考项目均可直接阅读，不需要重新下载。正式项目不会 Fork 任一项目，也不会复制参考项目的业务组件：

- `caliche-cards-master`、`ts-fsrs-main`、`ts-fsrs-demo-main`、`UnlearnableWord-master` 为 MIT。
- `TypeWords-master` 为 GPL-3.0，只研究行为，不复制代码、组件结构、CSS、资源或实质性控制流。
- 正式项目仅把 `ts-fsrs 5.4.1` 作为 npm 依赖；其他项目都不是运行时依赖。
- 正式实现采用 React + Vite、单一 Dexie 数据库、浏览器 TTS 和 Workbox 生成的 Service Worker，不继承账号、云数据库、微信云开发、Anki 导入或服务端认证。

## caliche-cards-master

### 技术栈与目录

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4。
- Dexie 4 与原生 `idb`；另含 MongoDB/GridFS、JWT、bcrypt、Next API Routes。
- `app/` 为页面、PWA metadata 和 API；`components/` 为复习 UI；`lib/` 为调度、IndexedDB、Anki 导入、媒体和同步；`public/` 为手写 Service Worker 与图标。
- README 的 Next 15/Tailwind 3/Node 18 描述已落后于 `package.json` 和 lockfile，不能作为版本依据。

### 核心实现

- `lib/studyDb.ts:10-40`：Dexie 表与复合索引。
- `lib/studyApi.ts:321-420`：事务式导入并保留已有学习状态。
- `lib/studyApi.ts:423-440,588-725`：从日志计算每日新词/复习额度。
- `lib/studyApi.ts:728-913`：取卡、更新状态、写复习日志。
- `components/review/WriteMode.tsx:168-217`：NFKC + 小写后的拼写判定。
- `app/manifest.ts:3-38`、`app/layout.tsx:26-60`：PWA 与 Apple metadata。
- `public/sw.js:1-157`：手写缓存策略。

### 可借鉴

1. 卡片快照更新与不可变复习日志在同一 Dexie 事务提交。
2. 索引围绕“词书 + 状态 + 到期时间”和“词书 + 复习时间”设计。
3. 词库内容与学习状态分离，重导入不覆盖进度。
4. 根据卡片能力降级学习模式，避免会话卡死。
5. 音频播放前后控制答案泄漏。

### 不采用

- MongoDB、认证、云同步、Next API 与 `.apkg` 导入。
- 两套 IndexedDB 和重复 schema。
- 两键简化调度器；它不是 FSRS，也不是完整 Anki 调度。
- 手写 Service Worker：导航响应可能污染 `/`，静态资源失败可能返回错误 MIME 的 HTML，且没有可靠的构建产物 precache 与更新协调。
- 超过 1600 行的页面/同步单文件结构。
- 缺少 `safe-area`、`viewport-fit=cover` 和 `100dvh` 的 iPhone 布局。

### 许可证

MIT，版权为 `Copyright (c) 2025 CalicheOrozco`。若复制实质性代码必须保留许可；本项目只借鉴设计思想，不复制其代码或品牌素材。

## ts-fsrs-main

### 技术栈与版本

- pnpm monorepo；核心包 `packages/fsrs` 为纯 TypeScript。
- 本地与 npm 当前稳定版均为 `ts-fsrs 5.4.1`，算法标识 `FSRS-6.0`。
- 要求 Node.js `>=20.0.0`，发布 ESM、CommonJS、UMD 与类型声明。
- MIT，版权为 `Copyright (c) 2026 Open Spaced Repetition`。

### 当前公共 API

- `State.New=0`、`Learning=1`、`Review=2`、`Relearning=3`。
- `Rating.Again=1`、`Hard=2`、`Good=3`、`Easy=4`；`Manual=0` 不能传给 `next()`。
- `createEmptyCard(now?)` 创建 New 卡。
- `fsrs(params?)` 创建调度器。
- `repeat(card, now)` 预览四种结果；`next(card, now, rating)` 提交单一评分。
- 结果包含 `{ card, log }`。`Card` 和完整 `ReviewLog` 均需持久化，回滚依赖旧 due、stability、difficulty、scheduled days 和 learning step。

关键证据：

- `packages/fsrs/src/models.ts:1-111`
- `packages/fsrs/src/default.ts:124-202`
- `packages/fsrs/src/fsrs.ts:179-327,395-618,640-659`
- `packages/fsrs/src/abstract_scheduler.ts:52-130`

### 正式集成选择

- 锁定 npm 依赖 `ts-fsrs@5.4.1`，不复制库源码。
- 通过唯一 `FsrsAdapter` 隔离业务模型与 FSRS 模型。
- IndexedDB 使用 epoch milliseconds；适配层显式转换 `Date`，避免 JSON 反序列化后日期类型丢失。
- 保存 v5 所需 `elapsed_days` 等兼容字段，但不让页面直接依赖这些将弃用字段。
- 卡片更新与完整日志写入同一 Dexie 事务。
- 普通到期条件统一为 `dueAt <= now`，再叠加“昨日新词首次正式复习”的业务规则。
- 首版不引入参数训练 binding、WASM、SharedArrayBuffer 或 COOP/COEP。

## ts-fsrs-demo-main

### 技术栈与目录

- Next.js、React、Hono、Kysely、PostgreSQL、NextAuth、Zod。
- demo 版本 `3.1.0`；lockfile 使用 `ts-fsrs 5.3.2`，正式项目升级到兼容的 `5.4.1`。
- `src/server/services/scheduler/review/` 包含评分、预览、撤销与重排流程；`src/hooks/` 负责客户端队列。
- MIT，版权为 `Copyright (c) 2023 ishiko`。

### 可借鉴

1. `src/server/services/scheduler/review/index.ts:238-326`：读取卡片，调用 `next()`，事务更新卡片并插入完整日志。
2. `index.ts:329-386`：通过当前卡片和完整 ReviewLog 调用 `rollback()`。
3. 数据库存毫秒时间戳，并在调度边界转为 `Date`。
4. 预览与最终评分分离。

### 不采用

- PostgreSQL、服务端认证、Hono、Kysely 和 LingQ 集成。
- New/Learning/Relearning 不检查 due、按 id 而非 due 排序的队列查询。
- 可撤销任意旧日志、事务外读卡导致并发丢更新、未排序日志直接 reschedule。
- 复用可变全局 scheduler 和已弃用 `fixDate`。
- 浏览器参数优化器示例；它不是普通调度所需的 Vite 集成。

## TypeWords-master

### 技术栈与目录

- Nuxt/Vue 3、Pinia、TypeScript、`ts-fsrs`、Supabase、idb-keyval。
- `packages/core/src/components/word/TypeWord.vue` 为逐字符练习核心。
- `apps/nuxt/app/pages/(words)/practice-words/[id].vue` 编排跟写、拼写、听写、默写和认词。
- `packages/core/src/hooks/sound.ts` 管理网络发音、浏览器 TTS 与提示音。

### 行为研究结论

- `packages/core/src/types/enum.ts:74-138` 定义 FollowWrite、Spell、Identify、Listen、Dictation。
- `TypeWord.vue:390-518` 区分完整提交与逐字符输入，维护正确片段、错误字符、错误次数和输入锁。
- `TypeWord.vue:559-654` 处理退格、显示答案与帮助。
- `packages/core/src/hooks/event.ts:112-217,315-401` 用隐藏输入框承接 iOS/Android 系统软键盘、IME composition 和重复事件；并非自绘“移动键盘”。
- 练习页 `569-747` 把本轮错词重新插队，并将错误持久化到错词词典。

### clean-room 采用范围

仅采用抽象需求：

- 看中文拼英文、听音拼写、完整提交、逐字符差异、错误事件、错词补练、英美音偏好和系统软键盘兼容。

正式项目自行定义组件 API、状态机、字符串差异算法、样式和反馈节奏；不使用有道发音接口或其音频素材，只用浏览器 `speechSynthesis`。

### 许可证风险

根 LICENSE 与 VS Code 子项目均为 GPL-3.0。浏览器收到的 JavaScript bundle 属于程序副本，不能把复制来的 GPL 组件简单并入非 GPL 项目后公开部署。`packages/libs`/`packages/utils` 的 package 字段虽写 ISC，但缺少清晰包级许可边界，仍不抽取代码。

## UnlearnableWord-master

### 技术栈与目录

- 微信小程序、微信云函数、云数据库、ECharts。
- `miniprogram/pages/index/` 为首页；`learning/`、`review/` 为两套流程；`overview/` 为词书与统计。
- `cloudfunctions/wordRouter/` 和 `statisticRouter/` 承担查询、SM-5 调度与统计。
- MIT，版权为 `Copyright (c) 2022 Mint-green`。

### 可借鉴

- `index.js:17-25,121-207` 与 `index.wxml:24-33`：今日学习和今日复习为独立状态、入口和流程。
- `overview.js:149-238,294-347`：词书、每日目标、统计与切换。
- `overview.wxml:8-104`：已学/掌握/未学进度和新学/复习双进度。
- `learning.js:70-78,286-501`：新词多轮队列和答错回退。
- `review.js:294-449`：复习评分与重新入队。
- `learning.js:672-733`、`review.js:601-659`：掌握和收藏。

### 不采用

- 微信云初始化、写死的环境 ID、`wx.cloud.callFunction`、云集合和文件上传。
- SM-5 源码；正式项目统一使用 `ts-fsrs`。
- 客户端可传任意 `user_id`、明文密码、批量索引偏移和复习结果错配等风险。
- 该项目没有独立持久化错词本；正式项目将 `mistakes` 设计为一等实体。
- README 明确拼写页尚未检验，不能视为成熟实现。
- UI 自述模仿商业应用，正式项目不复制其视觉、文案、图标或品牌识别。

### 第三方风险

根代码 MIT，但内嵌 ECharts 文件带 Apache-2.0 声明，词典自述来自 ECDICT；图片、字体、音频和数据必须逐项核查。本项目不复制这些资产或词典。

## 最终架构选择

| 领域 | 最终选择 | 参考来源 |
| --- | --- | --- |
| 本地数据 | 单一版本化 Dexie 数据库；状态与日志同事务 | caliche 的事务/索引思想，独立实现 |
| 调度 | npm `ts-fsrs@5.4.1` + 独立适配层 | ts-fsrs 公共 API |
| 新词/复习 | 首页和会话完全分离；每日计划持久化 | 用户要求 + Unlearnable 的产品边界 |
| 拼写 | 原生文本输入、独立字符差异算法、错误事件 | TypeWords 的行为启发，clean-room |
| 发音 | 浏览器 `speechSynthesis` 单例服务 | 用户要求，独立实现 |
| PWA | `vite-plugin-pwa`/Workbox 生成 precache 和更新提示 | 避开 caliche 手写 SW 缺陷 |
| 统计 | 由 ReviewLog、StudySession 和 DailyProgress 派生 | 独立领域模型 |
| 备份 | Zod 验证、导入前自动导出、Dexie 事务回滚 | 用户要求，独立实现 |
| 部署 | Cloudflare Pages Direct Upload | 静态 `dist`，无后端 |

## 为什么不直接 Fork

1. 参考项目的运行时和约束互相冲突：Next/MongoDB、PostgreSQL、Nuxt/Supabase、微信云开发都超出本地离线 PWA 范围。
2. 只有 `ts-fsrs` 是需要直接依赖的稳定领域库；Fork 整仓会引入无关认证、后端、导入和同步复杂度。
3. `TypeWords` 的 GPL-3.0 与 clean-room、最小许可风险目标不相容。
4. 各项目都缺少本任务的完整组合：两份指定 PDF、次日强制复习、单一 IndexedDB、版本化备份、iPhone 安全区与 Cloudflare Pages 验收。
5. 独立 React + Vite 架构更容易测试、静态部署、离线缓存和后续维护。
