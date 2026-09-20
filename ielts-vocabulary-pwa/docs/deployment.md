# 部署（Cloudflare Pages）

静态托管：构建命令 `pnpm build`，输出目录 `dist`。SPA 回退由
`public/_redirects`（`/* /index.html 200`）提供。

## 首次部署

```powershell
pnpm lint; pnpm typecheck; pnpm test; pnpm test:e2e; pnpm build
pnpm exec wrangler whoami          # 未登录时：
pnpm exec wrangler login           # 浏览器完成 OAuth 授权

# 幂等创建项目（已存在则直接复用）
pnpm exec wrangler pages project list
pnpm exec wrangler pages project create ielts-vocabulary-pwa --production-branch main

pnpm deploy:pages                  # = wrangler pages deploy dist --project-name ielts-vocabulary-pwa --branch main
```

## 后续更新

```powershell
pnpm build
pnpm deploy:pages
```

## 部署后验收

对线上地址运行托管冒烟（不启动本地 webServer）：

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://<project>.pages.dev"
pnpm exec playwright test e2e/onboarding.spec.ts e2e/study-modes.spec.ts --project chromium
```

并检查：HTTPS 200 与 SPA 路由刷新、`/manifest.webmanifest`、Service Worker
注册与离线 reload、`dist` 无 `.pdf`、无凭据泄漏。结果记入
`docs/deployment-result.md`。

## 访问权限

默认公开（词库仅供个人学习使用的声明常驻页面）。如需仅本人访问，可在
Cloudflare Zero Trust 中为该 Pages 域名配置 Access 邮箱白名单。
