# IELTS-Word PWA 设计说明

日期：2026-07-26  
状态：依据用户完整指示文档批准并进入实施

## 1. 产品边界

本项目是一款 iPhone 优先、离线优先、单用户、本地数据优先的雅思词汇 PWA。应用不提供账号、云同步、自建后端或付费 API。部署产物只包含应用代码、图标和从两份指定 PDF 提取的结构化词库；原始 PDF 永不进入仓库、`public`、`dist` 或 Cloudflare 上传目录。

首页和学习会话把“今日复习”与“今日新词”作为两个独立领域：

- 今日复习：到期、逾期、昨日首次学习且尚未完成次日正式复习、以及 Again 后已到短期重学时间的卡片。
- 今日新词：当前词书中从未引入、已固化到当天计划的词条。

两个队列不混排、不共用开始按钮。用户修改每日新词数量后，从下一自然日生效；如需当天生效，必须在设置页显式“重置今日计划”，已学词不会重新进入计划。

## 2. 技术架构

### 前端

- React 19 + TypeScript strict + Vite
- React Router
- Tailwind CSS
- Phosphor React 图标
- `@fontsource-variable/outfit` + iOS/PingFang 中文系统回退

### 本地数据

- Dexie + IndexedDB
- `dexie-react-hooks` 提供只读 live query
- 核心记录不写入 `localStorage`
- `localStorage` 也不承担设置保存；所有用户状态统一进入 IndexedDB

### 调度和日期

- `ts-fsrs@5.4.1`
- date-fns
- 数据库存 epoch milliseconds；页面显示时才转本地时间
- 当地日期键统一为 `YYYY-MM-DD`，由显式纯函数生成

### 校验、测试和 PWA

- Zod：词库、设置和备份格式验证
- Vitest + React Testing Library + fake-indexeddb
- Playwright：iPhone viewport、刷新持久化、跨日、离线和部署冒烟
- `vite-plugin-pwa` + Workbox：构建产物 precache、导航 fallback、更新提示

## 3. 模块边界

```text
src/
  app/                 应用启动、路由、Provider、PWA/网络状态
  db/                  Dexie schema、迁移、seed、事务
  domain/
    backup/            版本化导出、校验、导入和回滚
    daily/             本地日期、今日计划、复习筛选和排序
    fsrs/              ts-fsrs 适配、预览、评分和次日规则
    spelling/          答案规范化与字符差异
    statistics/        由日志和会话计算指标
  features/
    onboarding/
    home/
    study/
    collections/
    statistics/
    settings/
  services/
    audio/             speechSynthesis 单例封装
    storage/           persist/estimate 能力检测
  data/books/          两本结构化 JSON 与加载清单
  shared/              类型、组件、格式化和错误状态
```

页面不能直接调用 `ts-fsrs` 或 Dexie 表的底层细节。调度只经 `FsrsAdapter`，业务写入只经事务服务，UI 只消费领域结果。

## 4. 词库

统一词条：

```ts
interface VocabularyWord {
  id: string
  bookId: string
  sourceOrder: number
  sourceGroup?: string
  word: string
  normalizedWord: string
  phonetic?: string
  partOfSpeech?: string
  meanings: string[]
  note?: string
  tags?: string[]
}
```

稳定 ID 使用 `bookId + sourceOrder`，避免以后显示文本修正导致主键变化。同词书重复行仍保留，因为基础词汇可能在不同 Day 重复、听力主表与增补可能给出不同词性/释义；验证报告标出重复，而不是静默删除。两本词书的重合词分别保留其 bookId。

提取脚本：

- 基础词汇：读取矢量表格；按内容页每三页一个 Day；合并单元格后必须得到四列。
- 听力拼写：按页识别表头坐标；第 2-36 页和第 37-49 页分别使用动态列界；以英文列行顶点作为锚点，把词性、语义、备注分配给最近同一行。
- 音标缺单侧 `/` 时补齐；如果音标单元格只是普通英文或明显复制错位，置空并报告，不伪造 IPA。
- 文本执行 NFKC、首尾空格、连续空格、撇号和大小写规范化；展示词尽量保留来源，`normalizedWord` 用于比较和重复检测。

验证器至少覆盖以下 16 个语义类别；允许增加 schema、identity、count、sentinel 等更细检查。每个检查都逐项输出 `detected`、`fixed`、`remaining` 和代表性样本，不能只给一个总异常数：

1. 首尾/连续空格；
2. 大小写异常；
3. Unicode 规范化异常；
4. 断词或异常换行；
5. 音标错位；
6. 词性错位；
7. 重复表头或页码；
8. 空单词；
9. 空释义；
10. 同一词书重复；
11. 两词书重复；
12. 备注误拆；
13. 超长文本；
14. 疑似乱码；
15. Day/来源分组缺失；
16. 行边界泄漏，包括单词中混入中文或释义中混入下一行单词。

阻塞性异常必须使验证命令非零退出；可修复异常应先修复、再重新验证，并在报告中同时保留修复前后计数。

## 5. IndexedDB 数据模型

数据库名：`ielts-word-local`。

### 表

- `books`: 词书元数据、版本、是否启用。
- `words`: 全部词条；索引 `[bookId+sourceOrder]`、`[bookId+normalizedWord]`。
- `cards`: 每个词条一张调度卡；索引 `[bookId+dueAt]`、`[bookId+state+dueAt]`、`introducedOn`、`mastered`。
- `reviewLogs`: 不可变复习事件；索引 `[bookId+reviewedAt]`、`[cardId+reviewedAt]`、`studyDate`。
- `dailyPlans`: `bookId + dateKey` 的固定新词 ID 列表。
- `dailyProgress`: 当天完成计数和最近更新时间。
- `settings`: 单例设置记录。
- `favorites`: 词条收藏及时间。
- `mistakes`: 拼写错误次数、最近错误、最近答案。
- `studySessions`: 会话类型、模式、开始/结束、计划数和完成数。
- `appMeta`: schema、app、词库版本和 onboarding 状态。

### CardRecord

卡片保存 FSRS v5 完整快照：

- `state`、`dueAt`、`stability`、`difficulty`
- `elapsedDays`、`scheduledDays`、`learningSteps`
- `reps`、`lapses`、`lastReviewAt`
- `introducedOn`、`firstLearnedAt`
- `firstNextDayReviewAt`：次日正式复习完成后写入
- `lastMode`、`suspended`、`mastered`
- `createdAt`、`updatedAt`、`version`

评分事务同时更新卡片、追加完整 FSRS ReviewLog、更新错词/进度/会话。ReviewLog 额外保存模式、耗时、客观拼写正误、前后状态、参数版本和时区偏移。

### SettingsRecord

设置单例逐项保存：

- `currentBookId`
- `dailyNewLimit`
- `dailyReviewLimit`
- `defaultMode`
- `autoPlayPronunciation`
- `voiceLocale`（`en-GB`/`en-US`）
- `showPhonetic`
- `reviewFirst`
- `theme`（`light`/`dark`/`system`）
- `schemaVersion`
- `lastExportedAt`
- `installPromptDismissed`

“清空学习记录”必须显示影响范围和不可恢复提示，要求二次确认，并在一个 Dexie `rw` 事务中清空 cards、reviewLogs、dailyPlans、dailyProgress、favorites、mistakes 和 studySessions；内置 books/words、SettingsRecord 偏好和 appMeta 不删除。事务失败自动回滚，完成后重新查询关键表计数。

### Schema 迁移

当前应用以 Dexie v2 打开数据库，并保留可构造的 v1 fixture。v1 → v2 使用 `upgrade()` 补齐新增设置和卡片字段，不删除卡片、复习日志、收藏、错词或词书选择。迁移测试先写入 v1 学习进度，关闭数据库，再以 v2 重开并逐表核对记录和关键字段。

## 6. FSRS 与次日强制规则

首次引入时仍调用 `ts-fsrs.next()`，保留真实 difficulty、stability、state、reps 和完整日志。到期时间采用以下规则：

1. 计算 FSRS 原始 due。
2. 计算引入日期的次日本地零点。
3. 在 `firstNextDayReviewAt` 尚为空时，到期时间不能晚于次日本地零点。
4. Same-day Again/Hard 产生的短期 due 仍保留，因此可当天重学。
5. 任何同日重学后仍保持“次日正式复习待完成”；只有在当前本地日期晚于 `introducedOn` 且完成评分时才写 `firstNextDayReviewAt`。
6. 自该次评分起完全采用 FSRS 新 due，不再覆盖。

这样同时满足短期重学和“新学单词第二天必须进入复习区”。

复习排序键：

1. 到期且 `State.Relearning`
2. `introducedOn < today` 且 `firstNextDayReviewAt` 为空
3. 逾期时长降序
4. 普通 due 升序
5. card id 稳定排序

已掌握或 suspended 卡片始终过滤。每日最大复习数只限制普通 due 卡；同日 Again/Relearning 和所有 `firstNextDayReviewAt` 为空的跨日强制复习卡都绕过上限。即使强制次日卡数量大于 `dailyReviewLimit`，它们也必须全部显示并可进入复习会话。

## 7. 学习模式

### 普通记忆

先显示英文和发音按钮；揭示后显示音标、词性、释义、备注、收藏和掌握操作，再显示四级评分及四种预计间隔。

### 看中文拼英文

显示中文释义和可选词性；使用系统键盘输入。提交时 NFKC、忽略大小写和首尾空格；内部字符 diff 显示正确、替换、缺失、额外字符。错误以幂等 upsert 写入 `mistakes`，再进入评分。

### 听音拼写

默认隐藏英文与释义；用户手势触发发音，可重复播放，可按需显示中文提示。提交、错词和评分流程与看义拼词共用领域逻辑。

一个词条只有一张 FSRS 卡，`lastMode` 和 ReviewLog 记录实际模式，避免切换模式时生成三套互相竞争的调度。

## 8. 发音

`SpeechService` 是单例：

- 新播放前 `speechSynthesis.cancel()`，防止堆积。
- 只在用户手势或浏览器允许的后续自动播放中调用。
- 根据 `en-GB`/`en-US` 偏好排序语音；找不到时回退任一英文语音，再回退系统默认。
- 页面卸载/切词时取消。
- 无可用 API/voice 时返回结构化错误，UI 显示可操作提示。

## 9. 备份与恢复

备份 JSON 包含 appVersion、schemaVersion、exportedAt、所有用户表和词库版本，不重复导出内置 words/books 内容。导入流程：

1. 限制文件大小并只按文本解析 JSON。
2. Zod strict 校验和版本检查。
3. 展示卡片、日志、收藏、错词和时间范围摘要。
4. 二次确认。
5. 生成当前数据自动备份并触发下载。
6. 在一个 Dexie `rw` 事务内替换用户数据。
7. 任一步骤抛错时由事务自动回滚。
8. 重新查询关键计数并显示结果。

## 10. UI 与 iPhone

- 中文界面，单列宽度优先，桌面最大宽度约 560px。
- 温暖浅灰背景、炭黑文字、低饱和墨绿单一强调色；深色模式使用同色系，不使用紫蓝霓虹。
- 首页使用两个视觉和语义都独立的任务区；不使用三列等宽卡片。
- 底部导航和学习评分栏使用至少 44px 触控区。
- `viewport-fit=cover`、`min-height:100dvh`、顶部/底部 `env(safe-area-inset-*)`。
- 动画限制为 transform/opacity 的短过渡，遵守 `prefers-reduced-motion`，不做持续动画。
- 所有路由提供 loading、empty、error 和 offline 状态。
- 图标使用 Phosphor；PWA 图标为原创无文字图形。

首次启动除词书、每日量和模式外，还必须说明数据仅保存在本机、建议定期导出备份，并展示“词书仅供个人学习使用”。该备份提醒在完成初始化前可见。

首页的“今日复习”明确显示到期数、逾期数、已完成数和预计时长；“今日新词”显示计划数、已完成数和当前词书。首页另显示连续学习天数、今日总进度、最近 7 天学习量，以及错词、收藏、统计和设置入口；这些数值都来自领域查询而不是占位常量。

错词本显示错误次数、最近错误时间和当前 FSRS 状态，支持按错误次数排序、按词书筛选、移除和立即专项练习。收藏本支持搜索、按词书筛选、取消收藏和独立专项复习。专项练习复用学习组件，但不会创建第二张 FSRS 卡。

统计页至少计算今日新学、今日复习、今日正确率、四级评分分布、连续学习天数、最近 7 天和 30 天学习量、两本词书进度、最常拼错单词和未来到期卡片趋势。百分比在分母为零时显示明确空状态，不能显示 `NaN`。

## 11. PWA 与更新

- manifest：standalone、portrait-primary、主题色、192/512/maskable、apple-touch-icon。
- Workbox precache：HTML、JS、CSS、字体、图标和两本 JSON 词库。
- 不缓存 PDF、开发文件或外部 API。
- 导航 fallback 只返回 `index.html`。
- 新 Service Worker 等待；学习过程中只显示非阻断更新条，用户确认且没有未提交答案后才 `skipWaiting`/刷新。
- IndexedDB schema 和缓存版本彼此独立，SW 更新不会清空学习数据。

自动化分两层：Chromium 验证 Service Worker、离线 reload 和持久化；Playwright WebKit 的 iPhone device profile 验证核心路由、输入和 390×844 布局。WebKit device profile 不是实体 iPhone Safari，不能证明“添加到主屏幕”、真实 standalone 启动或刘海/Home Indicator 的物理遮挡。部署结果和最终回复必须把自动验证与实体 iPhone 人工确认分别记录；未收到实体机确认时只能写“未人工确认”，不得写成已通过。

## 12. 错误处理

- 启动 seed 失败：显示重试和错误原因，不进入半初始化状态。
- IndexedDB 配额/不可用：显示导出与清理建议。
- TTS 不可用：保留文本学习模式。
- 导入无效：不写数据库，列出首个可理解错误。
- 评分事务失败：卡片保持当前屏幕，可重试，不能前进到下一词。
- 路由级异常：ErrorBoundary 提供返回首页。
- 离线：显示状态但不阻止本地学习。

## 13. 测试与验收

### 单元

本地日期、次日规则、强制次日卡数量大于复习上限、FSRS 四评分、到期筛选/排序、固定计划、拼写规范化/diff、错词幂等、已掌握过滤、全部统计指标、完整设置字段、二次确认后的事务清空、v1 → v2 迁移、导出、Zod 导入和事务回滚。

### 组件

首页双分区及全部必显数值、答案揭示、评分按钮、拼写错误、错词/收藏专项入口、设置逐项保存、清空二次确认、导入摘要/确认、备份提醒、个人学习文案、空/加载/错误/离线、更新提示。

### E2E

首次启动、词书与每日量、新词、刷新持久化、使用持久 profile 关闭并重新打开后的 IndexedDB 持久化、模拟次日、复习、拼写错词、错词/收藏专项、掌握、导出/导入、Chromium 离线启动、WebKit iPhone profile 核心流程和安全区域 CSS。实体 iPhone 安装与 standalone 结果单独人工记录。

### 质量门

必须依次通过：

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

部署后再运行 HTTPS、manifest、Service Worker、核心路由、Chromium offline reload、WebKit iPhone profile 和移动布局冒烟测试。

## 14. 部署与交付证据

Cloudflare Pages 使用显式、可重复执行的项目创建流程：先查询项目；不存在时运行 `wrangler pages project create ielts-vocabulary-pwa --production-branch main`，已存在时继续使用同一项目，不能依赖未记录的交互式隐式创建。随后才上传 `dist`。

最终回复必须逐项给出正式目录、真实线上 URL、两本词书词数与异常修复、已实现功能、lint/typecheck/unit/component/E2E/build 的新鲜结果、iPhone 添加到主屏幕步骤、备份恢复、后续部署命令、隐私/访问权限和已知限制。实体 iPhone 未人工确认的项目必须明确标记为未确认。
