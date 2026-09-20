# 环境检查报告

检查日期：2026-07-26  
工作目录：`C:\Users\13035\Desktop\IELTS-Word`

## 运行环境

| 项目 | 检查结果 |
| --- | --- |
| Windows | `Microsoft Windows 10.0.26200` |
| PowerShell | `7.6.4` Core |
| Node.js | `24.15.0` |
| npm | `11.12.1` |
| pnpm | `11.2.2` |
| Git | `2.45.1.windows.1` |
| Python | `3.11.9` |
| pdfplumber | `0.11.9` |
| PyMuPDF | `1.27.2.3` |
| Wrangler | 全局未安装；正式项目将使用锁定的开发依赖 |

Node.js 满足 `ts-fsrs 5.4.1` 的 `>=20.0.0` 要求。2026-07-26 通过 npm registry 复核，`5.4.1` 是当前 `latest`，`6.0.0-beta.0` 仅为 beta。

## 参考项目

| 目录 | 文件数 | README | LICENSE | `.git` |
| --- | ---: | --- | --- | --- |
| `caliche-cards-master` | 112 | 存在 | MIT | 不存在 |
| `ts-fsrs-demo-main` | 185 | 存在 | MIT | 不存在 |
| `ts-fsrs-main` | 194 | 存在 | MIT | 不存在 |
| `TypeWords-master` | 408 | 存在 | GPL-3.0 | 不存在 |
| `UnlearnableWord-master` | 158 | 存在 | MIT | 不存在 |

五个目录均包含源码、配置和关键资源，符合 GitHub ZIP 解压后的源码快照形态。缺少 `.git` 不影响只读研究；未发现需要重新下载的损坏迹象。

## PDF 原始文件

| 文件 | 大小 | 页数 | SHA-256 |
| --- | ---: | ---: | --- |
| `一叶留学教育_雅思·托福基础词汇.pdf` | 2,192,646 bytes | 61 | `bd54bc05b42ef9ae6d4bcb2b66d7ae57320ebc4b8420310626a4831075129626` |
| `一叶留学教育_雅思听力拼写词汇.pdf` | 10,676,132 bytes | 49 | `40ed29f3b6be362f2c901c43962aee86ea6aad3c1d0cc186606baa07879a942e` |

两份 PDF 都包含可直接提取的文本层，不需要整本 OCR。基础词汇使用带矢量边界的四列表格；听力拼写第 2-36 页为主表，第 37-49 页为增补表，两段列坐标和行高不同。已使用 PyMuPDF 抽样渲染封面、首表、中段、版式切换页和末页。

本机的 Poppler 命令包装器不可用，因此视觉抽样采用 PyMuPDF；这不影响文本提取和页面渲染。

## 结论

环境满足 React、Vite、Dexie、`ts-fsrs`、Vitest、Playwright、PDF 提取及 Cloudflare Pages 静态部署要求。正式实现统一使用 pnpm；原始 PDF 保留在项目父目录，不进入 Git、`public`、`dist` 或部署上传目录。
