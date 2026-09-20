# 数据模型

数据库：`ielts-word-local`（Dexie v2）。所有时间为 epoch 毫秒；本地日期键
`YYYY-MM-DD` 由 `domain/daily/dateKey.ts` 统一生成。

## 表与主键

| 表 | 主键 | 说明 |
| --- | --- | --- |
| books | id | 词书元数据 |
| words | id (`bookId-序号`) | 词条；索引 `[bookId+sourceOrder]`、`[bookId+normalizedWord]` |
| cards | id (=wordId) | FSRS 卡快照；索引 `[bookId+dueAt]`、`[bookId+state+dueAt]`、`introducedOn` |
| reviewLogs | id | 不可变复习事件；索引 `studyDate`、`[cardId+reviewedAt]` 等 |
| dailyPlans | `bookId:dateKey` | 当日固定新词 ID 列表 |
| dailyProgress | `bookId:dateKey` | 新词完成 ID 与复习完成计数 |
| settings | 'default' | 12 字段设置单例 |
| favorites | id (=wordId) | 收藏 |
| mistakes | id (=wordId) | 错词聚合（次数/最近/最近答案） |
| studySessions | id | 会话（类型/模式/计划数/完成数） |
| appMeta | 'app' | schema/app/词库版本与 onboarding 状态 |

## CardRecord 关键字段

FSRS v5 快照（state、dueAt、stability、difficulty、elapsedDays、
scheduledDays、learningSteps、reps、lapses、lastReviewAt）加业务字段：
`introducedOn`（首次学习本地日期）、`firstLearnedAt`、
`firstNextDayReviewAt`（次日正式复习完成时间，写入后不再钳制）、
`lastMode`、`suspended`、`mastered`、`createdAt/updatedAt/version`。

## SettingsRecord（12 字段）

currentBookId、dailyNewLimit、dailyReviewLimit、defaultMode、
autoPlayPronunciation、voiceLocale（en-GB/en-US）、showPhonetic、
reviewFirst、theme（light/dark/system）、schemaVersion、lastExportedAt?、
installPromptDismissed。

## 迁移

v1 → v2 由 `db/migrations.ts` 的 `upgrade()` 补齐新增字段默认值
（learningSteps/suspended/mastered/version、settings 新字段），不删除、
不重写任何用户记录。`tests/unit/migration-v1-v2.test.ts` 以 v1 fixture
写入进度后用 v2 重开验证零丢失。
