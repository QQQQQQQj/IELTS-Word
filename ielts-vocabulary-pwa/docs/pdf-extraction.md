# PDF 词库提取

来源（不入库、不部署）：

- `一叶留学教育_雅思·托福基础词汇.pdf`（61 页，矢量表格，每 3 页一个 Day）
- `一叶留学教育_雅思听力拼写词汇.pdf`（49 页，主表 2-36 页 + 增补 37-49 页）

SHA-256 见 `reports/vocabulary-extraction-report.md`。

## 管线

```powershell
pip install -r scripts/requirements.txt   # pdfplumber==0.11.9
python scripts/extract_vocabulary.py --source-dir .. --output-dir src/data/books --report-dir reports
python scripts/validate_vocabulary.py --data-dir src/data/books --report reports/vocabulary-validation.json
python -m unittest discover -s tests/python -p test_extract_vocabulary.py -v
```

提取与报告完全确定性：连续两次运行逐字节一致。

## 结果

- 基础词汇 1997 条（20 Day；Day 4/11/16 各 99），首词 precise，末词 freeze；
  封面标 2000，矢量表实际 1997 行（来源事实，非漏行）。
- 听力拼写 2497 条（主表 1937 + 增补 560），首词 absence，末词 zoom lens；
  空词性 43、空释义 0、备注 94+39。
- 跨书规范化重合 754 词，双侧保留并打 `cross-book-overlap` 标签。
- 音标：24 条单侧斜杠机械补齐（repaired-phonetic）、16 条不可靠置空
  （invalid-phonetic）、2 条疑似复制错配保留并标记（suspect-phonetic）。
- 16 条词性列错位机械修复；释义内 `/` 保留（如「(研究/讨论)主题/对象」）。

## 验证契约

`reports/vocabulary-validation.json` 的 `checks` 至少含 16 个 snake_case
语义键（whitespace、case_anomaly、unicode_normalization、
broken_word_or_line、phonetic_misalignment、part_of_speech_misalignment、
header_or_page_number、empty_word、empty_meaning、duplicate_within_book、
duplicate_across_books、note_split、overlong_text、suspected_garbled_text、
missing_source_group、row_boundary_leakage）及 6 个完整性检查；每项含
detected/fixed/remaining/samples。`row_boundary_leakage` 为阻塞级：单词混入
中文或释义混入下一行英文都会使 CLI 非零退出。大小写如实报告：87 条来源大写
展示词保留原貌，其中 12 条疑似无理由大写记为 warning（fixed=0）。
