# 架构说明

## 总体

静态 React/Vite 单页应用。启动时 `AppBootstrap` 将打包为独立资源的两本词库
JSON 幂等 seed 进 Dexie 数据库；所有业务写入都经由领域层的事务服务，页面不
直接触碰 `ts-fsrs` 或 Dexie 底层细节。Workbox precache 应用壳与词库 JSON，
Cloudflare Pages 只托管 `dist`。

## 分层

```text
features(UI) → domain(纯逻辑/事务服务) → db(Dexie schema/seed/迁移)
                     ↘ services/audio（speechSynthesis 单例）
```

- `src/db`：`IELTSWordDatabase`（v1+v2 schema、v1→v2 upgrade）、`seedVocabulary`
  （幂等，不触碰用户表）、`ensureDefaultSettings`。
- `src/domain/fsrs`：`scheduleReview`（纯 FSRS 转换）、`previewSchedule`（四评分
  预览）、`reviewCard`（单事务：卡片 + 日志 + 每日进度 + 错词 upsert + 次日钳制）。
- `src/domain/daily`：本地日期键、固定每日新词计划（`getOrCreateDailyPlan` /
  `resetDailyPlan`）、`buildReviewQueue`（relearning → 强制次日 → 普通 due，
  上限只作用于普通组）。
- `src/domain/spelling`：NFKC 规范化 + Levenshtein 逐字符 diff。
- `src/domain/statistics`：由不可变日志/卡片计算全部指标。
- `src/domain/backup`：版本化导出、Zod strict 验证、单事务导入与回滚。
- `src/domain/settings`：二次确认的事务化清空。

## 关键不变量

1. 一个词条只有一张 FSRS 卡；模式记录在 `lastMode` 与 ReviewLog。
2. `firstNextDayReviewAt` 未写入前，同日复习的 due 不晚于次日本地零点。
3. 每日计划一旦生成不随刷新/改设置改变，只能显式重置。
4. 强制次日卡与到期 Relearning 卡永不被 `dailyReviewLimit` 隐藏。
5. Service Worker 更新与 IndexedDB 完全解耦，更新不清数据。
