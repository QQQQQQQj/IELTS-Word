# 测试说明

## 分层

| 层 | 工具 | 范围 |
| --- | --- | --- |
| 词库 | Python unittest | 提取行数/哨兵/标签/确定性/验证器阻塞行为（20 用例） |
| 单元 | Vitest + fake-indexeddb | 日期键、FSRS 四评分、次日钳制、队列上限、固定计划、拼写 diff、TTS、统计全指标、事务清空、v1→v2 迁移、备份导出/验证/回滚 |
| 组件 | Vitest + RTL | onboarding、首页双分区与全部指标、三种学习模式、错词/收藏/已掌握、设置逐项保存与二次确认、备份面板、PWA 状态条 |
| E2E | Playwright | 见下 |

## E2E 项目

- `chromium`：全部 spec，含 Service Worker/离线 reload、持久 profile 关闭重开、
  `page.clock` 模拟次日强制复习、备份导出→清空→导入还原、390×844 布局。
  本机安全策略阻止 Playwright 附带的 chrome-headless-shell 运行，因此
  chromium 项目固定 `channel: 'chromium'` 使用完整 Chromium 二进制。
- `webkit-iphone`（iPhone 13 device profile）：onboarding、学习模式、备份/
  收藏、safe-area 元数据与 44px 触控。仅为自动化近似，实体 iPhone 结果
  必须单独人工记录。本机安全策略无法直接运行 WebKit 可执行文件时，使用
  官方 Docker 镜像运行该项目（见下）。

## 命令

```powershell
pnpm test               # 单元 + 组件
pnpm test:e2e           # 两个项目（需本机可运行 WebKit）
pnpm exec playwright test --project chromium
```

Docker 中运行 WebKit 项目（宿主机先 `pnpm preview --host 0.0.0.0 --port 4173`）：

```powershell
docker run --rm -v "${PWD}:/work" -e PLAYWRIGHT_BASE_URL=http://host.docker.internal:4173 `
  mcr.microsoft.com/playwright:v1.62.0-noble `
  bash -lc "mkdir /tmp/wk && cp -r /work/e2e /work/playwright.config.ts /tmp/wk/ && cd /tmp/wk && npm init -y >/dev/null && npm i @playwright/test@1.62.0 --registry=https://registry.npmmirror.com >/dev/null && npx playwright test --project webkit-iphone"
```

## 质量门（部署前必须全部为 0 退出码）

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```
