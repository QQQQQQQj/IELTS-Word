# CHANGELOG

## 0.1.0（2026-07-28）

首个完整版本：

- PDF 词库提取与验证管线（Python + pdfplumber），4494 词条、16 类 snake_case 验证契约
- React 19 + TypeScript strict + Vite 基线，零警告 lint / typecheck 门槛
- Dexie v2 schema（11 张表）、幂等 seed、v1 → v2 迁移及迁移测试
- ts-fsrs 5.4.1 适配器、原子评分事务、新词次日强制复习钳制
- 固定每日新词计划与优先级复习队列（强制次日卡绕过 dailyReviewLimit）
- Onboarding、分离式首页、底部导航
- 普通记忆 / 看中文拼英文 / 听音拼写三种模式与可取消 TTS
- 错词本、收藏本、已掌握、统计、全字段设置、二次确认的事务化清空
- 版本化备份导出 / Zod 验证导入 / 自动预备份 / 事务回滚
- vite-plugin-pwa 离线缓存、非阻断更新提示、原创图标、iPhone 安全区域
- Vitest 单元 + 组件测试、Playwright Chromium 全量与 WebKit iPhone profile E2E
- Cloudflare Pages 部署脚本与文档
