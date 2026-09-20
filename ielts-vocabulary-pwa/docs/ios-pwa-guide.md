# iOS PWA 指南

## 用户安装步骤（iPhone Safari）

1. 打开部署网址（HTTPS）；
2. 点分享按钮 → 「添加到主屏幕」；
3. 从主屏幕启动即 standalone 模式；
4. 首次在线加载后离线可用；数据保存在本机 IndexedDB。

建议在 iOS 设置中避免「删除未使用的 App 数据」类清理工具清除 Safari 网站
数据；定期在设置页导出 JSON 备份。

## 验证分层（三层证据，不能互相替代）

### 1. 自动化：Chromium

- manifest 200、standalone、图标字段
- Service Worker 注册并接管页面
- 首次在线加载后离线 reload 成功
- 关闭浏览器（持久 profile）后重开 IndexedDB 数据保留
- 390×844 视口主按钮与底部导航可见、≥44px

### 2. 自动化：Playwright WebKit iPhone device profile

- `viewport-fit=cover`、安全区域 CSS、apple-mobile-web-app-* meta
- 核心 onboarding / 学习 / 收藏流程
- 44px 触控目标

**注意：WebKit device profile 只是 iPhone Safari 的自动化近似**，不能证明
真实设备上的「添加到主屏幕」、standalone 启动、刘海与 Home Indicator 表现。

### 3. 人工：实体 iPhone Safari 检查单

- [ ] Safari 打开线上网址
- [ ] 分享 → 添加到主屏幕，图标正确
- [ ] 从主屏幕启动为 standalone（无 Safari 地址栏）
- [ ] 断网后重新打开可用
- [ ] 顶部内容不被刘海遮挡、底部按钮不被 Home Indicator 遮挡
- [ ] 学习一个单词后杀掉 App 重开，进度保留

未执行实体机检查时，交付记录必须写「未人工确认」。
