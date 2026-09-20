# FSRS 设计

## 依赖

`ts-fsrs@5.4.1`（稳定版，不使用 6.x beta），默认参数，单例调度器。卡片在
IndexedDB 中保存完整 FSRS 快照，调度器无状态。

## 评分流程（`reviewCard`，单 Dexie 事务）

1. 读取卡片（不存在则报错；学习会话在评分前用 `createEmptyCardRecord` 落卡）。
2. `scheduleReview` 调用 `fsrs().next()` 得到新快照与日志数据。
3. 应用次日强制规则（见下）。
4. 写入卡片、追加不可变 ReviewLog（模式、评分、前后状态、耗时、拼写正误、
   时区偏移、是否新词）、更新 dailyProgress，`answerCorrect === false` 时幂等
   upsert 错词聚合。
5. 事务提交后返回 `{ card, log, fsrsDueAt }`；失败自动回滚，UI 停留当前卡。

## 新词次日必复习

- 首次学习记录 `introducedOn`（本地日期键）。
- `firstNextDayReviewAt` 为空且评分发生在引入当天：`dueAt = min(FSRS due,
  次日本地零点)`。Again/Hard 的短时重学 due 在零点前，保持不变，可当日重学。
- 之后任意更晚本地日期的第一次评分：写入 `firstNextDayReviewAt`，此后完全
  采用 FSRS 输出，不再钳制。
- 复习队列另有兜底：`introducedOn < today && !firstNextDayReviewAt` 的卡片
  一律进入今日复习（绕过 dailyReviewLimit），因此即使 due 被外部改动也不会漏。

## 队列排序

1. 到期 Relearning（短时重学）
2. 强制次日卡
3. 其余到期卡按 dueAt 升序（逾期最久优先），card id 稳定排序
4. `dailyReviewLimit` 仅截断第 3 组

对应测试：`tests/unit/fsrs-adapter.test.ts`、`next-day-review.test.ts`、
`review-queue.test.ts` 与 `e2e/persistence-next-day.spec.ts`。
