# Codex Goal 模式：IELTS-Word 雅思背单词 PWA 项目完整指示文档

> 使用方式：在 Codex 中启动 Goal 模式后，将本文件交给 Codex，并配合发送启动提示词。  
> 任务目标：让 Codex 读取指定目录中的 5 个参考项目和 2 本 PDF 单词书，独立完成一个适配 iPhone 的背单词 PWA，完成开发、测试、构建和部署。  
> 除账号登录、OAuth 授权、验证码、邮箱白名单等必须由用户亲自完成的步骤外，其余工作应由 Codex 连续执行，不得只输出方案或半成品。

---

## 一、任务总目标

在以下路径中完成项目：

```text
C:\Users\13035\Desktop\IELTS-Word
```

开发一个主要供用户本人在 iPhone 上使用的雅思背单词工具，最终应具备以下能力：

1. 使用 iPhone Safari 打开；
2. 可通过“添加到主屏幕”安装为 PWA；
3. 以接近普通 App 的方式独立打开；
4. 首次在线加载后可在离线状态下继续使用；
5. 支持选择不同单词书；
6. 支持设置每天新学单词数量；
7. 首页明确区分“今日复习”和“今日新词”；
8. 新词学完后自动写入学习记录；
9. 新学单词第二天必须进入复习区；
10. 后续复习由 FSRS 间隔重复算法动态安排；
11. 支持普通记忆、看中文拼英文、听音拼写；
12. 支持错词本、收藏本、已掌握列表；
13. 支持学习统计、连续学习天数和词书进度；
14. 支持学习数据导出、导入和恢复；
15. 学习记录默认保存在 iPhone 本地 IndexedDB；
16. 第一版不依赖自建服务器、动态数据库或付费 API；
17. 最终部署到适合静态 PWA 的托管平台，并提供可访问网址。

---

## 二、Goal 模式执行原则

Codex 必须把本任务当作完整软件工程项目持续推进。

### 2.1 必须做到

1. 先检查环境与文件；
2. 再阅读参考项目；
3. 再设计架构；
4. 再提取和清洗 PDF 词库；
5. 再创建正式项目；
6. 再实现功能；
7. 再编写和运行测试；
8. 再完成生产构建；
9. 最后部署并进行线上冒烟测试。

### 2.2 不允许出现的行为

- 不得只输出项目计划；
- 不得只输出伪代码；
- 不得只创建空页面；
- 不得只完成前端静态演示；
- 不得跳过数据持久化；
- 不得跳过 FSRS；
- 不得跳过测试；
- 不得声称部署成功但没有真实网址；
- 不得直接修改 5 个参考项目；
- 不得把用户密码、Token 或密钥写入源码；
- 不得把原始 PDF 上传到公开仓库；
- 不得通过关闭类型检查或删除测试来绕过问题。

### 2.3 允许暂停的情况

只有在以下步骤必须由用户本人操作时才允许暂停：

- GitHub 或 Cloudflare 登录；
- OAuth 授权；
- 邮箱、短信或双重验证码；
- 需要用户指定访问白名单邮箱；
- 浏览器弹出的授权确认；
- 平台明确禁止自动完成的身份验证步骤。

暂停时必须使用中文说明：

1. 当前执行到哪一步；
2. 为什么需要用户操作；
3. 用户需要点击哪里；
4. 完成后应回复什么。

用户完成操作后必须从当前阶段继续，不能重新开始。

---

## 三、固定目录与真实文件名称

### 3.1 项目根目录

```text
C:\Users\13035\Desktop\IELTS-Word
```

### 3.2 五个参考项目

参考项目直接位于项目根目录下，真实文件夹名称如下：

```text
C:\Users\13035\Desktop\IELTS-Word\caliche-cards-master

C:\Users\13035\Desktop\IELTS-Word\ts-fsrs-demo-main

C:\Users\13035\Desktop\IELTS-Word\ts-fsrs-main

C:\Users\13035\Desktop\IELTS-Word\TypeWords-master

C:\Users\13035\Desktop\IELTS-Word\UnlearnableWord-master
```

这些目录可能来自 GitHub ZIP 解压，因此不一定包含 `.git` 文件夹。

要求：

- 如果目录存在且代码完整，直接读取，不要重新下载；
- 不得因为缺少 `.git` 就判定项目无效；
- 检查 README、LICENSE、package 配置、源码目录和关键功能；
- 参考目录只读，不得直接修改；
- 如目录确实损坏或缺少关键文件，再询问或重新拉取对应仓库。

### 3.3 两份 PDF 单词书

真实路径：

```text
C:\Users\13035\Desktop\IELTS-Word\一叶留学教育_雅思·托福基础词汇.pdf

C:\Users\13035\Desktop\IELTS-Word\一叶留学教育_雅思听力拼写词汇.pdf
```

开始处理前，必须使用 PowerShell 或程序确认两个文件真实存在，并输出文件大小。

### 3.4 正式项目目录

正式项目必须创建在：

```text
C:\Users\13035\Desktop\IELTS-Word\ielts-vocabulary-pwa
```

所有正式代码、数据、测试、文档和部署配置都写入此目录。

禁止将正式代码直接写入：

```text
caliche-cards-master
ts-fsrs-demo-main
ts-fsrs-main
TypeWords-master
UnlearnableWord-master
```

---

## 四、参考项目分析要求

正式编码前必须分析 5 个参考项目，并在正式项目中生成：

```text
docs/reference-project-analysis.md
```

### 4.1 `caliche-cards-master`

重点研究：

- PWA 架构；
- 手机端页面组织；
- IndexedDB / Dexie 使用；
- 词书和卡片数据模型；
- 每日学习数量；
- 新卡与复习卡状态；
- 拼写题和音频；
- 离线缓存；
- iPhone 适配；
- 本地优先设计。

需要识别并排除：

- 不必要的账号系统；
- 云数据库；
- 与本项目无关的复杂后端；
- 过度复杂的卡片导入功能。

### 4.2 `ts-fsrs-main`

重点研究：

- 当前版本 `ts-fsrs` API；
- Card、ReviewLog、Rating、State；
- `Again / Hard / Good / Easy`；
- 新卡、学习、复习、重学状态；
- 下一次复习时间计算；
- 浏览器端序列化与保存；
- 参数配置；
- Node.js 版本要求。

正式项目应将 `ts-fsrs` 作为 NPM 依赖安装，不复制整个库源码。

### 4.3 `ts-fsrs-demo-main`

重点研究：

- 网页项目接入 FSRS 的完整流程；
- 卡片评分后状态更新；
- 复习日志；
- 到期卡片查询；
- 用户操作和调度器衔接；
- 撤销操作；
- 下一次复习间隔展示。

不得照搬其服务端数据库、登录和认证架构。

### 4.4 `UnlearnableWord-master`

重点研究：

- 中文背单词产品流程；
- 首页“今日新词”和“今日复习”分离；
- 词书切换；
- 每日任务；
- 已学、未学、收藏和错词；
- 学习统计；
- 看词识义、看义识词和拼写模式。

只学习交互和业务逻辑，不直接继承旧微信云开发代码。

### 4.5 `TypeWords-master`

重点研究：

- 逐字符输入反馈；
- 看中文拼英文；
- 听音拼写；
- 错误字符提示；
- 错词自动记录；
- 发音选择；
- 移动端键盘；
- 单词输入体验。

必须检查许可证。若项目为 GPL：

- 不得复制代码；
- 不得复制大段组件；
- 只能理解功能后独立重写。

### 4.6 分析文档内容

`docs/reference-project-analysis.md` 至少包括：

- 项目名称；
- 技术栈；
- 目录结构；
- 核心功能；
- 可借鉴的设计；
- 可作为依赖使用的内容；
- 不能直接复制的内容；
- 许可证风险；
- 本项目最终选择；
- 为什么不直接 Fork 某一个项目。

分析完成后直接继续开发，不等待用户确认。

---

## 五、正式项目技术方案

优先采用以下技术栈：

```text
React
TypeScript
Vite
React Router
Tailwind CSS
Dexie.js
IndexedDB
ts-fsrs
vite-plugin-pwa
Zod
date-fns
Vitest
React Testing Library
Playwright
```

图表可选：

```text
ECharts
或 Recharts
```

### 5.1 技术约束

1. 使用满足当前 `ts-fsrs` 要求的 Node.js 版本；
2. 优先使用 `pnpm`；
3. 如果本机未安装 pnpm，可使用 Corepack 或 npm 安装；
4. 全项目统一使用一种包管理器；
5. TypeScript 开启严格模式；
6. 不使用 MongoDB；
7. 不使用 MySQL；
8. 不使用 PostgreSQL；
9. 不使用 Firebase；
10. 不使用 Supabase；
11. 不使用自建后端；
12. 不依赖付费词典 API；
13. 不使用 `localStorage` 保存核心学习记录；
14. 核心数据使用 IndexedDB；
15. 项目必须可以静态构建；
16. 项目必须适合 Cloudflare Pages 或同类静态托管。

### 5.2 推荐命令

项目至少提供：

```text
dev
build
preview
lint
typecheck
test
test:e2e
```

---

## 六、PDF 单词书提取任务

必须将两份 PDF 转换为结构化词库，并保留可重复执行的提取脚本。

### 6.1 雅思·托福基础词汇

来源：

```text
一叶留学教育_雅思·托福基础词汇.pdf
```

预期字段：

- Day；
- 单词；
- 音标；
- 词性；
- 中文释义。

要求：

- 保留 Day 分组；
- 保留原始顺序；
- 清理表头、页码和异常换行；
- 一个词可能有多条中文释义；
- 不要把音标误拼接到单词中。

### 6.2 雅思听力拼写词汇

来源：

```text
一叶留学教育_雅思听力拼写词汇.pdf
```

预期字段：

- 词汇；
- 词性；
- 语义；
- 备注。

要求：

- 保留备注；
- 允许音标为空；
- 备注中可能出现复数、英式拼写、派生词；
- 清理跨行和列错位；
- 不把备注当作新单词。

### 6.3 提取策略

按以下优先级：

1. PDF 原生文本解析；
2. 表格边界与页面结构规则；
3. 对异常页面进行专门清洗；
4. OCR 仅作为最后手段；
5. 不得对整本 PDF 重复高成本 OCR；
6. 提取脚本必须可重复执行；
7. 提取结果必须经过自动验证和抽样检查。

### 6.4 统一词条结构

建议：

```ts
export interface VocabularyWord {
  id: string;
  bookId: string;
  sourceOrder: number;
  sourceGroup?: string;
  word: string;
  normalizedWord: string;
  phonetic?: string;
  partOfSpeech?: string;
  meanings: string[];
  note?: string;
  tags?: string[];
}
```

### 6.5 输出文件

建议：

```text
src/data/books/ielts-toefl-basic.json
src/data/books/ielts-listening-spelling.json
src/data/books/index.ts
```

脚本：

```text
scripts/extract-vocabulary.*
scripts/validate-vocabulary.*
```

报告：

```text
reports/vocabulary-extraction-report.md
reports/vocabulary-validation.json
```

### 6.6 清洗规则

必须检测并处理：

- 首尾空格；
- 大小写异常；
- Unicode 异常；
- 断词；
- 音标错位；
- 词性错位；
- 表头重复；
- 页码；
- 空单词；
- 空释义；
- 同一词书重复；
- 两词书重复；
- 备注误拆；
- 超长文本；
- 疑似乱码；
- Day 缺失；
- 单词中混入中文；
- 释义中混入下一行单词。

两本词书之间的重复单词不能简单删除，应保留各自词书归属。

### 6.7 词库验证

最终报告至少显示：

- 两本词书各自词条总数；
- 空释义数量；
- 空音标数量；
- 重复数量；
- Day 分组数量；
- 异常词条数量；
- 清洗修复数量；
- 抽样检查结果。

如果检测出明显异常，应自动修复后重新验证。

---

## 七、IndexedDB 数据设计

使用 Dexie 建立本地数据库。

建议表：

```text
books
words
cards
reviewLogs
dailyPlans
dailyProgress
settings
favorites
mistakes
studySessions
appMeta
```

### 7.1 词书表

```ts
interface BookRecord {
  id: string;
  name: string;
  description: string;
  totalWords: number;
  enabled: boolean;
  version: number;
  createdAt: string;
}
```

### 7.2 学习卡片表

```ts
type StudyMode =
  | "recognition"
  | "zh-to-en"
  | "listening-spelling";

interface CardRecord {
  id: string;
  wordId: string;
  bookId: string;
  mode: StudyMode;

  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  lastReview?: string;

  introducedOn?: string;
  firstLearnedAt?: string;
  suspended: boolean;
  mastered: boolean;

  createdAt: string;
  updatedAt: string;
}
```

实际字段必须根据当前安装的 `ts-fsrs` 版本调整，保持兼容。

### 7.3 复习日志

```ts
interface ReviewLogRecord {
  id: string;
  cardId: string;
  wordId: string;
  bookId: string;
  mode: StudyMode;

  rating: 1 | 2 | 3 | 4;
  reviewedAt: string;
  previousDue?: string;
  nextDue: string;

  elapsedDays: number;
  scheduledDays: number;
  stateBefore: number;
  stateAfter: number;

  durationMs?: number;
  answerCorrect?: boolean;
}
```

### 7.4 用户设置

至少包含：

- 当前词书；
- 每日新词数量；
- 每日最大复习数量；
- 默认学习模式；
- 自动播放发音；
- 英式或美式语音偏好；
- 是否显示音标；
- 是否先复习后学新词；
- 主题；
- 数据版本；
- 最近导出时间；
- 安装提示是否关闭。

---

## 八、FSRS 与每日复习逻辑

### 8.1 四级评分

界面中文按钮：

```text
完全不会 → Again
有点模糊 → Hard
认识 → Good
很简单 → Easy
```

评分后必须：

1. 更新卡片状态；
2. 写入复习日志；
3. 更新下一次到期时间；
4. 立即持久化到 IndexedDB；
5. 显示下一次复习的大致时间。

### 8.2 新词第二天必须复习

这是强制业务规则。

实现要求：

1. 新词首次完成学习时记录 `introducedOn`；
2. 第一次正式复习时间不得晚于次日本地日期；
3. 次日必须出现在“今日复习”；
4. 第一次正式复习之后再完全交给 FSRS；
5. 不破坏 FSRS 数据结构；
6. 为该规则编写单元测试和 E2E 测试；
7. 正确处理夜间跨日和本地时区。

### 8.3 今日复习队列

包括：

- 已到期卡片；
- 逾期卡片；
- 昨日首次学习卡片；
- Again 后短时重学卡片。

推荐排序：

1. 逾期最久；
2. Again 重学；
3. 昨日新词；
4. 正常到期；
5. 其他。

### 8.4 今日新词队列

要求：

- 从当前选定词书中生成；
- 仅包含从未引入的词；
- 数量等于用户设置或剩余词数；
- 当日计划一旦生成，不因刷新重新随机；
- 当日修改每日数量时有明确规则；
- 学完后从新词区消失；
- 第二天进入复习区。

### 8.5 复习和新词完全分离

首页必须有两个独立入口：

```text
今日复习
今日新词
```

不得把二者放进同一个混合队列，也不得用一个按钮统一开始。

---

## 九、页面与功能设计

整体要求：

- 中文界面；
- iPhone 优先；
- 简洁、耐看；
- 单手操作友好；
- 按钮触控区域足够大；
- 支持浅色和深色模式；
- 适配刘海屏和底部 Home Indicator；
- 不过度使用动画；
- 不照搬商业背词应用。

### 9.1 首次启动

包括：

1. 欢迎说明；
2. 选择词书；
3. 设置每日新词数量；
4. 选择默认学习模式；
5. 数据仅保存在本机的说明；
6. 定期导出备份提醒；
7. 完成初始化。

### 9.2 首页

必须显示：

#### 今日复习

- 到期数量；
- 逾期数量；
- 已完成数量；
- 预计时长；
- 开始复习按钮。

#### 今日新词

- 今日计划；
- 已完成数量；
- 当前词书；
- 开始学习按钮。

其他信息：

- 连续学习天数；
- 今日总进度；
- 最近 7 天学习情况；
- 错词本；
- 收藏本；
- 统计；
- 设置。

### 9.3 普通记忆模式

流程：

1. 显示英文；
2. 可播放发音；
3. 用户回忆；
4. 点击显示答案；
5. 展示音标、词性、中文释义和备注；
6. 选择四级评分；
7. 显示下一次复习时间；
8. 进入下一词。

### 9.4 看中文拼英文

流程：

1. 显示中文释义；
2. 显示可选词性；
3. 输入英文；
4. 忽略大小写与首尾空格；
5. 对错误字符给出反馈；
6. 可显示答案；
7. 拼错自动记录；
8. 完成后仍需四级评分。

### 9.5 听音拼写

流程：

1. 默认隐藏英文；
2. 用户点击播放；
3. 输入拼写；
4. 支持重复播放；
5. 可显示中文提示；
6. 对错反馈；
7. 错误自动进入错词本；
8. 支持显示答案；
9. 再进行 FSRS 评分。

### 9.6 错词本

支持：

- 查看拼错次数；
- 最近错误时间；
- 按错误次数排序；
- 按词书筛选；
- 立即专项练习；
- 从错词本移除；
- 查看当前复习状态。

### 9.7 收藏本

支持：

- 收藏；
- 取消收藏；
- 单独复习；
- 搜索；
- 按词书筛选。

### 9.8 已掌握

要求：

- 可手动标记；
- 默认停止进入日常复习；
- 不删除历史记录；
- 可恢复到学习状态；
- 操作前二次确认。

### 9.9 统计页

至少包括：

- 今日新学数；
- 今日复习数；
- 今日正确率；
- 四级评分分布；
- 连续学习天数；
- 最近 7 天学习量；
- 最近 30 天学习量；
- 两本词书完成进度；
- 最常拼错单词；
- 到期卡片趋势。

### 9.10 设置页

至少包括：

- 当前词书；
- 每日新词数量；
- 每日最大复习数量；
- 默认模式；
- 自动发音；
- 英式/美式语音；
- 音标显示；
- 主题；
- 导出数据；
- 导入数据；
- 重置今日计划；
- 清空学习记录；
- PWA 安装说明；
- 隐私说明；
- 版本信息。

---

## 十、发音方案

优先使用浏览器原生：

```ts
window.speechSynthesis
```

要求：

- 优先选择英文语音；
- 支持英式/美式偏好；
- 找不到指定语音时自动降级；
- iOS 上由用户点击触发；
- 防止重复点击产生语音堆积；
- 页面切换时取消未完成播放；
- 无语音可用时给出友好提示；
- 不依赖付费发音 API；
- 不把整本词书音频打包进项目。

---

## 十一、PWA 与 iPhone 适配

### 11.1 Manifest

至少设置：

- 应用名称；
- 简短名称；
- 应用图标；
- `display: standalone`；
- 主题色；
- 背景色；
- 起始地址；
- 合适的屏幕方向。

### 11.2 图标

生成：

```text
favicon
apple-touch-icon
192x192
512x512
maskable icon
```

图标必须原创，不使用商业应用图标。

### 11.3 离线缓存

缓存：

- 应用壳；
- CSS；
- JavaScript；
- 图标；
- 两本 JSON 词库；
- 必要本地资源。

不缓存：

- 原始 PDF；
- 开发文件；
- 无关大文件；
- 不稳定第三方接口。

### 11.4 版本更新

要求：

- 检测新版本；
- 不在学习过程中强制刷新；
- 弹出更新提示；
- 用户确认后更新；
- 更新前不丢失 IndexedDB；
- Dexie schema 升级提供迁移。

### 11.5 iPhone 安全区域

使用：

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

确保底部操作按钮不被 Home Indicator 遮挡。

### 11.6 安装提示

在 iPhone Safari 中可显示：

```text
点击分享按钮 → 添加到主屏幕
```

提示可关闭，不反复打扰。

---

## 十二、学习数据导出与导入

### 12.1 导出

导出版本化 JSON，包含：

- 应用版本；
- 数据版本；
- 导出时间；
- 设置；
- 卡片状态；
- 复习日志；
- 每日计划；
- 错词；
- 收藏；
- 已掌握；
- 学习会话。

示例文件名：

```text
ielts-words-backup-YYYY-MM-DD.json
```

### 12.2 导入

导入时：

1. 使用 Zod 验证；
2. 检查版本；
3. 显示备份摘要；
4. 二次确认；
5. 导入前自动备份当前数据；
6. 导入失败自动回滚；
7. 不执行文件中的任意脚本；
8. 显示明确结果。

### 12.3 数据迁移

明确保存：

```text
schemaVersion
appVersion
```

数据库结构变化必须提供迁移逻辑。

---

## 十三、隐私与词书保护

1. 学习记录只保存在本地；
2. 不将用户学习记录上传到服务端；
3. 原始 PDF 不进入公开部署产物；
4. 原始 PDF 不提交到公开 GitHub；
5. 网页中不提供原始 PDF 下载；
6. 页面中标注“词书仅供个人学习使用”；
7. 如果创建 GitHub 仓库，优先创建私有仓库；
8. 部署到 Cloudflare Pages 时优先连接私有仓库；
9. 如需私人访问，可配置 Cloudflare Access；
10. 不允许用前端硬编码密码冒充安全登录。

如需配置邮箱白名单，开发、测试和基础部署完成后再询问用户邮箱。

---

## 十四、测试要求

### 14.1 单元测试

至少覆盖：

- 新卡首次学习；
- 新词次日强制复习；
- Again；
- Hard；
- Good；
- Easy；
- 到期卡片筛选；
- 逾期排序；
- 今日新词计划固定；
- 跨日刷新；
- 本地时区；
- 拼写判定；
- 错词记录；
- 已掌握过滤；
- 导出；
- 导入验证；
- 导入失败回滚。

### 14.2 组件测试

至少覆盖：

- 首页数量；
- 新词与复习分区；
- 卡片显示答案；
- 四级评分按钮；
- 拼写输入；
- 错误提示；
- 设置保存；
- 数据导入确认；
- 空状态；
- 加载状态；
- 离线状态。

### 14.3 E2E 测试

使用 Playwright 测试：

1. 首次启动；
2. 选择词书；
3. 设置每日数量；
4. 学习新词；
5. 刷新后进度保留；
6. 模拟次日；
7. 新词进入复习区；
8. 完成复习；
9. 拼写错误进入错词本；
10. 收藏单词；
11. 导出数据；
12. 导入数据；
13. 移动端 viewport；
14. 离线启动；
15. 底部按钮未被遮挡。

### 14.4 部署前质量门槛

必须真实执行并通过：

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

如果使用 npm，则执行等效命令。

不得通过以下方式规避：

- 删除失败测试；
- 大量使用 `any`；
- 关闭 TypeScript 严格模式；
- 忽略构建错误；
- 在测试中跳过核心业务逻辑。

---

## 十五、项目文档

正式项目至少生成：

```text
README.md
CHANGELOG.md
THIRD_PARTY_NOTICES.md

docs/architecture.md
docs/reference-project-analysis.md
docs/data-model.md
docs/fsrs-design.md
docs/pdf-extraction.md
docs/ios-pwa-guide.md
docs/deployment.md
docs/testing.md
docs/privacy.md

reports/vocabulary-extraction-report.md
reports/vocabulary-validation.json
```

README 必须包含：

- 项目介绍；
- 功能；
- 技术栈；
- 本地运行；
- 构建；
- 测试；
- 部署；
- iPhone 添加到主屏幕；
- 离线说明；
- 导入导出；
- 隐私说明；
- 目录结构；
- 已知限制。

---

## 十六、Git 要求

在以下目录初始化 Git：

```text
C:\Users\13035\Desktop\IELTS-Word\ielts-vocabulary-pwa
```

建议分阶段提交：

```text
chore: initialize project
docs: add reference project analysis
feat: add vocabulary extraction pipeline
feat: add local database
feat: add fsrs scheduling
feat: add daily queues
feat: add study modes
feat: add mistakes favorites and mastered lists
feat: add statistics and settings
feat: add pwa offline support
test: add unit component and e2e tests
docs: add deployment and ios guide
fix: resolve production issues
```

`.gitignore` 必须排除：

```text
node_modules
dist
.env
.env.*
原始 PDF
私人备份文件
Token
本地临时文件
测试截图中的私人信息
```

提供 `.env.example`，但不得写真实密钥。

---

## 十七、部署要求

目标优先使用：

```text
Cloudflare Pages
```

### 17.1 构建

默认：

```text
Build command: pnpm build
Output directory: dist
```

### 17.2 Codex 需要完成

1. 确认生产构建成功；
2. 检查 SPA 路由；
3. 检查 HTTPS；
4. 检查 Manifest；
5. 检查 Service Worker；
6. 检查静态资源路径；
7. 检查移动端布局；
8. 调用 Cloudflare CLI 或平台流程；
9. 启动登录授权；
10. 等待用户完成必要授权；
11. 创建 Pages 项目；
12. 部署 `dist`；
13. 获取真实线上网址；
14. 访问线上网址；
15. 进行冒烟测试；
16. 验证 PWA 安装资源；
17. 验证离线缓存；
18. 记录后续更新方式。

### 17.3 需要用户授权时

使用类似提示：

```text
项目已完成本地构建，现在需要登录 Cloudflare 才能正式部署。
请在浏览器中完成登录并点击 Allow/Authorize。
完成后回到 Codex，回复“Cloudflare 授权完成”。
```

### 17.4 私人访问

如用户要求只允许本人访问：

- 优先配置 Cloudflare Access；
- 询问允许访问的邮箱；
- 测试未授权状态；
- 测试授权邮箱；
- 如果免费域名或当前配置不支持，应明确说明，不得伪造已完成。

### 17.5 部署结果文档

生成：

```text
docs/deployment-result.md
```

记录：

- 部署日期；
- Cloudflare 项目名；
- 线上网址；
- 构建命令；
- 输出目录；
- 访问权限；
- PWA 验证结果；
- 离线验证结果；
- 更新部署命令。

---

## 十八、执行阶段

### 阶段 1：环境检查

- 检查根目录；
- 检查 5 个参考项目；
- 检查 2 个 PDF；
- 检查 Node；
- 检查 pnpm/npm；
- 检查 Git；
- 检查 PowerShell；
- 输出环境报告。

### 阶段 2：参考项目分析

- 阅读 README；
- 阅读 LICENSE；
- 检查 package 配置；
- 查找关键代码；
- 生成分析文档。

### 阶段 3：词库提取

- 创建提取脚本；
- 提取两本 PDF；
- 清洗；
- 验证；
- 抽样检查；
- 生成 JSON 和报告。

### 阶段 4：正式项目初始化

- 创建 React + TypeScript + Vite；
- 配置 Tailwind；
- 配置路由；
- 配置测试；
- 配置 lint 和 typecheck。

### 阶段 5：本地数据库与 FSRS

- 建立 Dexie；
- 导入词库；
- 创建学习卡；
- 接入 FSRS；
- 实现次日强制复习；
- 实现每日队列；
- 编写测试。

### 阶段 6：核心页面

- 首次启动；
- 首页；
- 今日新词；
- 今日复习；
- 普通记忆；
- 看中文拼英文；
- 听音拼写。

### 阶段 7：辅助功能

- 错词本；
- 收藏；
- 已掌握；
- 统计；
- 设置；
- 数据导入导出。

### 阶段 8：PWA 与 iPhone

- Manifest；
- 图标；
- Service Worker；
- 离线缓存；
- 安全区域；
- 安装提示；
- 更新提示。

### 阶段 9：测试和修复

- 单元测试；
- 组件测试；
- E2E；
- 移动端；
- 跨日；
- 离线；
- 生产构建；
- 修复全部阻塞错误。

### 阶段 10：部署

- Cloudflare 登录；
- 用户授权；
- 创建 Pages；
- 部署；
- 获取网址；
- 线上冒烟测试；
- 记录结果。

### 阶段 11：最终交付

输出：

- 项目目录；
- 线上网址；
- 两本词书词数；
- 测试结果；
- iPhone 安装步骤；
- 备份方式；
- 更新部署方式；
- 隐私状态；
- 已知限制。

---

## 十九、最终验收标准

只有全部满足后才能声明完成。

### 功能验收

- [ ] 两本 PDF 已转换为结构化词库；
- [ ] 可选择词书；
- [ ] 可设置每日新词数量；
- [ ] 首页明确区分新词和复习；
- [ ] 新词学完后次日进入复习；
- [ ] 后续由 FSRS 调度；
- [ ] 四级评分可用；
- [ ] 普通记忆可用；
- [ ] 看中文拼英文可用；
- [ ] 听音拼写可用；
- [ ] 错词本可用；
- [ ] 收藏可用；
- [ ] 已掌握可用；
- [ ] 统计可用；
- [ ] 数据导出可用；
- [ ] 数据导入可用。

### 数据验收

- [ ] 刷新后进度不丢失；
- [ ] 关闭后重新打开不丢失；
- [ ] 跨日计划正确；
- [ ] 数据升级有迁移；
- [ ] 导入失败可回滚。

### PWA 验收

- [ ] iPhone Safari 可打开；
- [ ] 可添加到主屏幕；
- [ ] standalone 模式可用；
- [ ] 图标正确；
- [ ] 安全区域正确；
- [ ] 首次加载后可离线打开；
- [ ] 更新不清空学习数据。

### 质量验收

- [ ] Lint 通过；
- [ ] TypeScript 类型检查通过；
- [ ] 单元测试通过；
- [ ] 组件测试通过；
- [ ] E2E 通过；
- [ ] 生产构建通过；
- [ ] 无明显控制台错误；
- [ ] 文档完整。

### 部署验收

- [ ] 已真实部署；
- [ ] 已获得真实网址；
- [ ] 已进行线上冒烟测试；
- [ ] 已说明访问权限；
- [ ] 已提供 iPhone 安装步骤；
- [ ] 已记录后续更新方式。

---

## 二十、最终交付报告格式

完成后在 Codex 对话中输出：

```markdown
# IELTS-Word 项目交付完成

## 正式项目路径
C:\Users\13035\Desktop\IELTS-Word\ielts-vocabulary-pwa

## 线上网址
...

## 参考项目分析
...

## 词库提取结果
- 雅思·托福基础词汇：
- 雅思听力拼写词汇：
- 异常修复：
- 重复词条：

## 已实现功能
...

## 测试结果
- lint：
- typecheck：
- unit：
- component：
- e2e：
- build：

## iPhone 安装步骤
1. ...
2. ...
3. ...

## 数据保存和备份
...

## 部署与更新
...

## 隐私与访问权限
...

## 已知限制
...
```

---

## 二十一、立即开始

现在立即执行：

1. 进入：

```text
C:\Users\13035\Desktop\IELTS-Word
```

2. 检查以下目录：

```text
caliche-cards-master
ts-fsrs-demo-main
ts-fsrs-main
TypeWords-master
UnlearnableWord-master
```

3. 检查以下文件：

```text
一叶留学教育_雅思·托福基础词汇.pdf
一叶留学教育_雅思听力拼写词汇.pdf
```

4. 创建正式目录：

```text
C:\Users\13035\Desktop\IELTS-Word\ielts-vocabulary-pwa
```

5. 开始环境检查和参考项目分析；
6. 按阶段持续执行；
7. 遇到普通错误自行修复；
8. 除必须由用户完成的登录、授权和验证码外，不得中途停止；
9. 最终完成真实部署并返回网址。
