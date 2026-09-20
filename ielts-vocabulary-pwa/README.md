# IELTS Word 雅思背单词 PWA

离线优先、iPhone 优先的个人雅思背单词工具。词库来自两本指定 PDF 单词书的
结构化提取结果；全部学习数据只保存在本机浏览器的 IndexedDB 中，没有账号、
云同步、后端或付费 API。**词书仅供个人学习使用。**

## 功能

- 两本词书：雅思·托福基础词汇（1997 词）、雅思听力拼写词汇（2497 词）
- 首页把「今日复习」和「今日新词」作为两个完全独立的任务区
- 可设置每日新词数量；当日计划固定，不因刷新改变
- 新学单词第二天强制进入复习区（即使超过每日复习上限也不隐藏）
- 首次次日复习之后由 FSRS（ts-fsrs 5.4.1）调度，四级评分：完全不会 / 有点模糊 / 认识 / 很简单
- 三种学习模式：普通记忆、看中文拼英文、听音拼写（逐字符差异反馈）
- 浏览器原生发音（speechSynthesis），支持英式 / 美式偏好
- 错词本、收藏本、已掌握列表，以及错词 / 收藏专项练习
- 学习统计：今日新学 / 复习 / 正确率、评分分布、连续天数、7 / 30 天趋势、词书进度、最常拼错、未来到期
- 版本化 JSON 备份：导出、Zod 严格验证、导入前摘要与二次确认、事务回滚
- vite-plugin-pwa + Workbox 离线缓存；Service Worker 更新为非阻断提示，不清空学习数据
- iPhone 安全区域（刘海 / Home Indicator）适配与添加到主屏幕引导

## 技术栈

React 19 · TypeScript（strict）· Vite · React Router · Tailwind CSS v4 ·
Dexie（IndexedDB）· ts-fsrs 5.4.1 · Zod · vite-plugin-pwa · Vitest ·
React Testing Library · fake-indexeddb · Playwright · pnpm

## 本地运行

```powershell
pnpm install
pnpm dev
```

词库 JSON 已提交到 `src/data/books/`。如需从 PDF 重新提取（PDF 不在仓库中，
需放在项目父目录）：

```powershell
pip install -r scripts/requirements.txt
pnpm extract:vocabulary
pnpm validate:vocabulary
```

## 测试与构建

```powershell
pnpm lint        # ESLint（零警告门槛）
pnpm typecheck   # tsc -b（src / 配置 / 测试 / e2e 全参与）
pnpm test        # Vitest 单元 + 组件测试（fake-indexeddb）
pnpm test:e2e    # Playwright（chromium + webkit-iphone 两个项目）
pnpm build       # 生产构建（含 Service Worker 与 manifest）
python -m unittest discover -s tests/python -p test_extract_vocabulary.py
```

Playwright 支持 `PLAYWRIGHT_BASE_URL` 指向线上地址做部署后验收；不设置时
自动 `pnpm build && pnpm preview` 启动本地生产预览。

## 部署

Cloudflare Pages（静态托管，输出目录 `dist`）：

```powershell
pnpm build
pnpm exec wrangler login
pnpm deploy:pages
```

详见 `docs/deployment.md` 与 `docs/deployment-result.md`。

## iPhone 添加到主屏幕

1. 用 iPhone Safari 打开部署网址；
2. 点击底部「分享」按钮；
3. 选择「添加到主屏幕」；
4. 从主屏幕图标启动即为独立（standalone）模式，首次在线加载后可离线使用。

## 数据、备份与隐私

- 所有学习记录只保存在本机 IndexedDB（数据库 `ielts-word-local`），不上传任何服务器；
- 设置页可导出版本化 JSON 备份（`ielts-words-backup-YYYY-MM-DD.json`）；
- 导入时经过 Zod 严格验证、展示摘要、二次确认，导入前自动下载当前数据备份，失败自动回滚；
- 清空学习记录需要二次确认，且只清用户数据，词库与偏好保留；
- 原始 PDF 不进入仓库、`public`、`dist` 或任何部署产物。

## 目录结构

```text
scripts/            PDF 提取与验证脚本（Python）
src/app             启动、路由、PWA / 网络状态
src/data/books      两本词库 JSON 与加载清单
src/db              Dexie schema、迁移、seed
src/domain          FSRS、每日队列、拼写、统计、备份、清空
src/features        onboarding / home / study / collections / statistics / settings
src/services        浏览器 TTS 封装
src/shared          外壳、导航、通用组件
tests/unit          领域与数据库单元测试
tests/components    React 组件测试
tests/python        词库提取回归测试
e2e/                Playwright 端到端测试
reports/            词库提取与验证报告
docs/               架构、数据模型、部署等文档
```

## 已知限制

- 发音依赖系统内置语音，离线可用性与音色因设备而异；
- WebKit iPhone device profile 是自动化近似，不能代替实体 iPhone Safari 验收；
- 词库为个人学习用途，未做多用户或云同步设计。
