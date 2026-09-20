# THIRD PARTY NOTICES

本项目为个人学习用途。词库内容提取自「一叶留学教育」两本 PDF 单词书，仅供
个人学习使用，不提供 PDF 下载，也不将 PDF 打包进任何构建产物。

## 运行时依赖（MIT 除特别注明外）

- react / react-dom 19.2.8 — MIT
- react-router-dom 7.18.1 — MIT
- dexie 4.4.4 / dexie-react-hooks 4.4.0 — Apache-2.0
- ts-fsrs 5.4.1 — MIT
- zod 4.4.3 — MIT
- date-fns 4.4.0 — MIT
- @phosphor-icons/react 2.1.10 — MIT
- @fontsource-variable/outfit 5.3.0 — OFL-1.1（字体）/ MIT（打包代码）

## 开发与测试依赖

vite、@vitejs/plugin-react、typescript、tailwindcss、@tailwindcss/vite、
vite-plugin-pwa、workbox-window、vitest、@vitest/coverage-v8、jsdom、
@testing-library/*、fake-indexeddb、@playwright/test、eslint、@eslint/js、
typescript-eslint、eslint-plugin-react-hooks、eslint-plugin-react-refresh、
globals、wrangler —— 各自遵循其 MIT / Apache-2.0 许可证。

Python 提取管线：pdfplumber 0.11.9（MIT）及其依赖。

## 参考项目（clean-room 策略）

开发前分析了以下开源项目，仅借鉴行为与思路，未复制其代码或 UI：

- caliche-cards（MIT）
- ts-fsrs / ts-fsrs-demo（MIT）—— ts-fsrs 以 NPM 依赖方式使用
- UnlearnableWord（MIT）
- TypeWords（GPL-3.0）—— 明确未复制任何代码、组件或界面，仅参考交互行为
