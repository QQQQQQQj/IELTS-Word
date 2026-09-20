# Vocabulary Extraction Report

This report is generated deterministically by `scripts/extract_vocabulary.py`; it contains no run timestamp or machine-specific path.

## Source PDFs

| Source | SHA-256 | Pages | Layout |
| --- | --- | ---: | --- |
| `一叶留学教育_雅思·托福基础词汇.pdf` | `bd54bc05b42ef9ae6d4bcb2b66d7ae57320ebc4b8420310626a4831075129626` | 61 | Pages 2–61, vector ruled table; four non-empty columns; every three pages form one Day. |
| `一叶留学教育_雅思听力拼写词汇.pdf` | `40ed29f3b6be362f2c901c43962aee86ea6aad3c1d0cc186606baa07879a942e` | 49 | Pages 2–36 main table and Pages 37–49 supplement; English-column text lines anchor POS, meaning, and note within 5 pt; Page 47 uses the supplement fallback coordinates. |

## Reconciliation

The basic-book cover advertises **2000** words. The vector table contains **1997** source rows (a difference of 3); all Pages 2–61 were parsed and reconciled, so this is **not a missing-row defect**.

| Book | Source rows | Final entries | Unique normalized | Duplicate keys | Duplicate extra | Empty meanings | Empty POS | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ielts-toefl-basic` | 1997 | 1997 | 1996 | 1 | 1 | 0 | 0 | 0 |
| `ielts-listening-spelling` | 2497 | 2497 | 2465 | 31 | 32 | 0 | 43 | 133 |

- Basic structure: **20 Day** groups; Day 4, Day 11, and Day 16 contain 99 rows, and every other Day contains 100.
- Listening structure: main **1937** + supplement **560** = **2497**.
- Listening notes: main **94**, supplement **39**.
- Cross-book normalized overlap: **754** keys; rows are retained in both books and tagged `cross-book-overlap`.
- Meanings split only on explicit Chinese/English semicolons; `/` inside one source meaning remains intact.
- Display words retain source casing. `normalizedWord` uses NFKC, collapsed whitespace, normalized apostrophes, and casefolding.

## Day distribution

| Group | Rows |
| --- | ---: |
| Day 1 | 100 |
| Day 2 | 100 |
| Day 3 | 100 |
| Day 4 | 99 |
| Day 5 | 100 |
| Day 6 | 100 |
| Day 7 | 100 |
| Day 8 | 100 |
| Day 9 | 100 |
| Day 10 | 100 |
| Day 11 | 99 |
| Day 12 | 100 |
| Day 13 | 100 |
| Day 14 | 100 |
| Day 15 | 100 |
| Day 16 | 99 |
| Day 17 | 100 |
| Day 18 | 100 |
| Day 19 | 100 |
| Day 20 | 100 |

## Phonetic anomaly and repair audit

The 40 structurally irregular source cells split into 24 `repaired-phonetic` rows and 16 `invalid-phonetic` rows. Two additional well-formed but likely copied values are retained as `suspect-phonetic`.

### `repaired-phonetic` (24)

| Page | ID | Word | Source cell | Result |
| ---: | --- | --- | --- | --- |
| 12 | `ielts-toefl-basic-0371` | `drag` | `/dræɡ` | `/dræɡ/` — added the missing boundary slash after IPA-feature validation |
| 17 | `ielts-toefl-basic-0500` | `hire` | `/ˈhaɪə(r)` | `/ˈhaɪə(r)/` — added the missing boundary slash after IPA-feature validation |
| 39 | `ielts-toefl-basic-1243` | `ancestor` | `/ˈænsestə(r)` | `/ˈænsestə(r)/` — added the missing boundary slash after IPA-feature validation |
| 41 | `ielts-toefl-basic-1323` | `facial` | `ˈfeɪʃl/` | `/ˈfeɪʃl/` — added the missing boundary slash after IPA-feature validation |
| 42 | `ielts-toefl-basic-1342` | `rhyme` | `/raɪm` | `/raɪm/` — added the missing boundary slash after IPA-feature validation |
| 44 | `ielts-toefl-basic-1407` | `serve` | `/sɜːv` | `/sɜːv/` — added the missing boundary slash after IPA-feature validation |
| 44 | `ielts-toefl-basic-1412` | `mix` | `/mɪks` | `/mɪks/` — added the missing boundary slash after IPA-feature validation |
| 44 | `ielts-toefl-basic-1434` | `object` | `/ˈɒbdʒɪkt` | `/ˈɒbdʒɪkt/` — added the missing boundary slash after IPA-feature validation |
| 45 | `ielts-toefl-basic-1478` | `downtown` | `/ˈdaʊntaʊn` | `/ˈdaʊntaʊn/` — added the missing boundary slash after IPA-feature validation |
| 46 | `ielts-toefl-basic-1490` | `appropriate` | `/əˈprəʊpriət` | `/əˈprəʊpriət/` — added the missing boundary slash after IPA-feature validation |
| 48 | `ielts-toefl-basic-1568` | `choke` | `/tʃəʊk` | `/tʃəʊk/` — added the missing boundary slash after IPA-feature validation |
| 54 | `ielts-toefl-basic-1741` | `announcement` | `/əˈnaʊnsmənt` | `/əˈnaʊnsmənt/` — added the missing boundary slash after IPA-feature validation |
| 59 | `ielts-toefl-basic-1915` | `sensitive` | `ˈsensətɪv/` | `/ˈsensətɪv/` — added the missing boundary slash after IPA-feature validation |
| 59 | `ielts-toefl-basic-1916` | `lamp` | `/læmp` | `/læmp/` — added the missing boundary slash after IPA-feature validation |
| 59 | `ielts-toefl-basic-1921` | `topic` | `/ˈtɒpɪk` | `/ˈtɒpɪk/` — added the missing boundary slash after IPA-feature validation |
| 60 | `ielts-toefl-basic-1939` | `bright` | `/braɪt` | `/braɪt/` — added the missing boundary slash after IPA-feature validation |
| 60 | `ielts-toefl-basic-1940` | `award` | `əˈwɔːd/` | `/əˈwɔːd/` — added the missing boundary slash after IPA-feature validation |
| 60 | `ielts-toefl-basic-1955` | `mineral` | `/ˈmɪnərəl` | `/ˈmɪnərəl/` — added the missing boundary slash after IPA-feature validation |
| 60 | `ielts-toefl-basic-1970` | `patience` | `/ˈpeɪʃns` | `/ˈpeɪʃns/` — added the missing boundary slash after IPA-feature validation |
| 60 | `ielts-toefl-basic-1972` | `bake` | `/beɪk` | `/beɪk/` — added the missing boundary slash after IPA-feature validation |
| 60 | `ielts-toefl-basic-1974` | `taste` | `/teɪst` | `/teɪst/` — added the missing boundary slash after IPA-feature validation |
| 60 | `ielts-toefl-basic-1978` | `list` | `/lɪst` | `/lɪst/` — added the missing boundary slash after IPA-feature validation |
| 61 | `ielts-toefl-basic-1982` | `present` | `/ˈpreznt` | `/ˈpreznt/` — added the missing boundary slash after IPA-feature validation |
| 61 | `ielts-toefl-basic-1984` | `contain` | `/kənˈteɪn` | `/kənˈteɪn/` — added the missing boundary slash after IPA-feature validation |

### `invalid-phonetic` (16)

| Page | ID | Word | Source cell | Result |
| ---: | --- | --- | --- | --- |
| 23 | `ielts-toefl-basic-0720` | `aboard` | `/ə/tˈebəɔ(ːrd) /` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 23 | `ielts-toefl-basic-0721` | `bride` | `//bterəa(ɪdr)/` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 23 | `ielts-toefl-basic-0722` | `credit` | `/ˈ/kterəe(drɪ)t /` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 23 | `ielts-toefl-basic-0723` | `technique` | `/t/etkeəˈn(ri)ːk/ /` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 24 | `ielts-toefl-basic-0753` | `security` | `security` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 32 | `ielts-toefl-basic-1029` | `congratulate` | `congratulate` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 35 | `ielts-toefl-basic-1119` | `overhead` | `/ˌə/ʊdvɪˈəlˈiːhte/ d/` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 35 | `ielts-toefl-basic-1120` | `action` | `//ˈdæɪˈkliʃːnt//` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 38 | `ielts-toefl-basic-1219` | `advertise` | `//ˈˈækdɒvŋəktraiːɪtz//` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 38 | `ielts-toefl-basic-1221` | `detective` | `//ˈdkɪɒˈtŋekkrtɪivːt//` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 41 | `ielts-toefl-basic-1319` | `twist` | `/k/ətˈwreɪsktʃ/n /` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 41 | `ielts-toefl-basic-1320` | `alley` | `/kə/ˈˈærelki/ʃ n/` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 44 | `ielts-toefl-basic-1431` | `minibus` | `minibus` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 59 | `ielts-toefl-basic-1910` | `classify` | `classify` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 59 | `ielts-toefl-basic-1925` | `secretary` | `harvest` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |
| 60 | `ielts-toefl-basic-1968` | `flashlight` | `flashlight` | `omitted` — omitted the structurally invalid source cell; no IPA was invented |

### `suspect-phonetic` (2)

| Page | ID | Word | Source cell | Result |
| ---: | --- | --- | --- | --- |
| 53 | `ielts-toefl-basic-1720` | `assumption` | `/əˈtenʃn/` | `/əˈtenʃn/` — retained the well-formed source value and flagged likely copy mismatch |
| 61 | `ielts-toefl-basic-1995` | `encouragement` | `/ˈsɪəriəs/` | `/ˈsɪəriəs/` — retained the well-formed source value and flagged likely copy mismatch |

## POS alignment fixes (16)

These repairs are mechanical boundary corrections. Chinese text found at the end of a POS cell is moved back to the beginning of its meaning; a bare POS abbreviation followed by a separate `.` is rejoined; the two basic-book punctuation defects are normalized to the book's own format.

| Page | ID | Source word | Source POS | Source meaning | Final word | Final POS | Final meaning | Fix |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 20 | `ielts-toefl-basic-0608` | `amazing` | `a..` | `惊奇的,惊叹的;震惊的` | `amazing` | `a.` | `惊奇的,惊叹的 / 震惊的` | `pos-punctuation-normalized` |
| 54 | `ielts-toefl-basic-1774` | `combine` | `.v.` | `使结合;使化合;兼有` | `combine` | `v.` | `使结合 / 使化合 / 兼有` | `pos-punctuation-normalized` |
| 2 | `ielts-listening-spelling-0028` | `African` | `n./adj. 非` | `洲人/非洲的` | `African` | `n./adj.` | `非洲人/非洲的` | `pos-meaning-boundary-restored` |
| 2 | `ielts-listening-spelling-0047` | `alternative` | `n./adj. 替` | `代品` | `alternative` | `n./adj.` | `替代品` | `pos-meaning-boundary-restored` |
| 2 | `ielts-listening-spelling-0050` | `American` | `n./adj. 美` | `国人/美国的` | `American` | `n./adj.` | `美国人/美国的` | `pos-meaning-boundary-restored` |
| 3 | `ielts-listening-spelling-0083` | `Asian` | `n./adj. 亚` | `洲人/亚洲的` | `Asian` | `n./adj.` | `亚洲人/亚洲的` | `pos-meaning-boundary-restored` |
| 3 | `ielts-listening-spelling-0096` | `Australian` | `n./adj. 澳` | `大利亚人/澳大利亚的` | `Australian` | `n./adj.` | `澳大利亚人/澳大利亚的` | `pos-meaning-boundary-restored` |
| 3 | `ielts-listening-spelling-0103` | `back` | `n./adj. 后` | `背/后面的` | `back` | `n./adj.` | `后背/后面的` | `pos-meaning-boundary-restored` |
| 6 | `ielts-listening-spelling-0258` | `chemical` | `n./adj. 化` | `学药品/化学的` | `chemical` | `n./adj.` | `化学药品/化学的` | `pos-meaning-boundary-restored` |
| 9 | `ielts-listening-spelling-0431` | `department store n` | `.` | `百货商店` | `department store` | `n.` | `百货商店` | `word-pos-punctuation-rejoined` |
| 9 | `ielts-listening-spelling-0434` | `deputy` | `n./adj. 代` | `表/副的` | `deputy` | `n./adj.` | `代表/副的` | `pos-meaning-boundary-restored` |
| 22 | `ielts-listening-spelling-1172` | `open` | `n./adj. 户` | `外/开放的` | `open` | `n./adj.` | `户外/开放的` | `pos-meaning-boundary-restored` |
| 22 | `ielts-listening-spelling-1185` | `outside` | `adv./adj. 在` | `户外/外部的` | `outside` | `adv./adj.` | `在户外/外部的` | `pos-meaning-boundary-restored` |
| 28 | `ielts-listening-spelling-1519` | `self-employment n` | `.` | `个体经营` | `self-employment` | `n.` | `个体经营` | `word-pos-punctuation-rejoined` |
| 34 | `ielts-listening-spelling-1817` | `underground` | `adj./adv. 在` | `地下` | `underground` | `adj./adv.` | `在地下` | `pos-meaning-boundary-restored` |
| 36 | `ielts-listening-spelling-1933` | `young` | `adj./n. 年` | `轻的/年轻人` | `young` | `adj./n.` | `年轻的/年轻人` | `pos-meaning-boundary-restored` |

## Known source anomalies: case, Unicode, POS, and notes

- Source-display casing warnings: **87**. These include legitimate months, nationalities, and proper names; they remain non-blocking because normalized forms are lowercase.
- Non-ASCII display word rows: **1**; Unicode is preserved while normalized forms are checked with NFKC.
- Mechanically repaired POS boundary/punctuation rows: **16**; every source and final value is listed above.
- Remaining POS alignment warnings after repair: **0**.
- Non-empty listening note rows: **133** (main 94, supplement 39). Notes remain separate from meanings.

| Kind | Page | ID | Word | Observed source value |
| --- | ---: | --- | --- | --- |
| Unicode | 5 | `ielts-listening-spelling-0201` | `café` | non-ASCII display spelling |
| Case warning | 2 | `ielts-listening-spelling-0004` | `Accommodation` | source display casing retained |
| Case warning | 2 | `ielts-listening-spelling-0027` | `Africa` | source display casing retained |
| Case warning | 2 | `ielts-listening-spelling-0028` | `African` | source display casing retained |
| Case warning | 2 | `ielts-listening-spelling-0049` | `America` | source display casing retained |
| Case warning | 2 | `ielts-listening-spelling-0050` | `American` | source display casing retained |
| Case warning | 3 | `ielts-listening-spelling-0066` | `April` | source display casing retained |
| Case warning | 3 | `ielts-listening-spelling-0082` | `Asia` | source display casing retained |
| Case warning | 3 | `ielts-listening-spelling-0083` | `Asian` | source display casing retained |
| Case warning | 3 | `ielts-listening-spelling-0094` | `August` | source display casing retained |
| Case warning | 3 | `ielts-listening-spelling-0095` | `Australia` | source display casing retained |
| Case warning | 3 | `ielts-listening-spelling-0096` | `Australian` | source display casing retained |
| Case warning | 5 | `ielts-listening-spelling-0177` | `British` | source display casing retained |
| Case warning | 5 | `ielts-listening-spelling-0213` | `Canada` | source display casing retained |
| Case warning | 5 | `ielts-listening-spelling-0214` | `Canadian` | source display casing retained |
| Case warning | 6 | `ielts-listening-spelling-0236` | `CD` | source display casing retained |
| Case warning | 6 | `ielts-listening-spelling-0266` | `Chinese` | source display casing retained |
| Case warning | 8 | `ielts-listening-spelling-0396` | `CV` | source display casing retained |
| Case warning | 9 | `ielts-listening-spelling-0415` | `December` | source display casing retained |
| Case warning | 10 | `ielts-listening-spelling-0485` | `DJ` | source display casing retained |
| Case warning | 11 | `ielts-listening-spelling-0521` | `DVD` | source display casing retained |
| Case warning | 11 | `ielts-listening-spelling-0523` | `Earth` | source display casing retained |
| Case warning | 12 | `ielts-listening-spelling-0569` | `England` | source display casing retained |
| Case warning | 12 | `ielts-listening-spelling-0570` | `English` | source display casing retained |
| Case warning | 12 | `ielts-listening-spelling-0582` | `Europe` | source display casing retained |
| Case warning | 12 | `ielts-listening-spelling-0583` | `European` | source display casing retained |
| Case warning | 12 | `ielts-listening-spelling-0622` | `February` | source display casing retained |
| Case warning | 14 | `ielts-listening-spelling-0682` | `France` | source display casing retained |
| Case warning | 14 | `ielts-listening-spelling-0686` | `French` | source display casing retained |
| Case warning | 14 | `ielts-listening-spelling-0689` | `Friday` | source display casing retained |
| Case warning | 14 | `ielts-listening-spelling-0724` | `Germany` | source display casing retained |
| Case warning | 16 | `ielts-listening-spelling-0833` | `ID` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0852` | `India` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0853` | `Indian` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0877` | `Internet` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0884` | `Italian` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0889` | `January` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0890` | `Japan` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0891` | `Japanese` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0903` | `July` | source display casing retained |
| Case warning | 17 | `ielts-listening-spelling-0904` | `June` | source display casing retained |
| Case warning | 19 | `ielts-listening-spelling-0984` | `London` | source display casing retained |
| Case warning | 19 | `ielts-listening-spelling-1016` | `March` | source display casing retained |
| Case warning | 20 | `ielts-listening-spelling-1032` | `May` | source display casing retained |
| Case warning | 21 | `ielts-listening-spelling-1088` | `Monday` | source display casing retained |
| Case warning | 21 | `ielts-listening-spelling-1132` | `New Year` | source display casing retained |
| Case warning | 22 | `ielts-listening-spelling-1133` | `New Zealand` | source display casing retained |
| Case warning | 22 | `ielts-listening-spelling-1143` | `North America` | source display casing retained |
| Case warning | 22 | `ielts-listening-spelling-1150` | `November` | source display casing retained |
| Case warning | 22 | `ielts-listening-spelling-1163` | `October` | source display casing retained |
| Case warning | 27 | `ielts-listening-spelling-1455` | `Roman` | source display casing retained |
| Case warning | 27 | `ielts-listening-spelling-1471` | `Russia` | source display casing retained |
| Case warning | 27 | `ielts-listening-spelling-1472` | `Russian` | source display casing retained |
| Case warning | 28 | `ielts-listening-spelling-1488` | `Saturday` | source display casing retained |
| Case warning | 28 | `ielts-listening-spelling-1500` | `Scotland` | source display casing retained |
| Case warning | 28 | `ielts-listening-spelling-1528` | `September` | source display casing retained |
| Case warning | 30 | `ielts-listening-spelling-1608` | `Spain` | source display casing retained |
| Case warning | 30 | `ielts-listening-spelling-1609` | `Spanish` | source display casing retained |
| Case warning | 31 | `ielts-listening-spelling-1680` | `Sunday` | source display casing retained |
| Case warning | 32 | `ielts-listening-spelling-1745` | `Thursday` | source display casing retained |
| Case warning | 33 | `ielts-listening-spelling-1799` | `T-shirt` | source display casing retained |
| Case warning | 33 | `ielts-listening-spelling-1800` | `Tuesday` | source display casing retained |
| Case warning | 33 | `ielts-listening-spelling-1807` | `TV` | source display casing retained |
| Case warning | 33 | `ielts-listening-spelling-1811` | `UK` | source display casing retained |
| Case warning | 35 | `ielts-listening-spelling-1885` | `Wednesday` | source display casing retained |
| Case warning | 37 | `ielts-listening-spelling-1959` | `Argentina` | source display casing retained |
| Case warning | 37 | `ielts-listening-spelling-1963` | `Austria` | source display casing retained |
| Case warning | 38 | `ielts-listening-spelling-2027` | `Comparative` | source display casing retained |
| Case warning | 40 | `ielts-listening-spelling-2091` | `Empathy` | source display casing retained |
| Case warning | 40 | `ielts-listening-spelling-2094` | `Enclosure` | source display casing retained |
| Case warning | 41 | `ielts-listening-spelling-2126` | `Florida` | source display casing retained |
| Case warning | 41 | `ielts-listening-spelling-2131` | `Font` | source display casing retained |
| Case warning | 41 | `ielts-listening-spelling-2150` | `Greek` | source display casing retained |
| Case warning | 41 | `ielts-listening-spelling-2155` | `Hazel` | source display casing retained |
| Case warning | 43 | `ielts-listening-spelling-2227` | `Malaria` | source display casing retained |
| Case warning | 43 | `ielts-listening-spelling-2233` | `Mars` | source display casing retained |
| Case warning | 43 | `ielts-listening-spelling-2238` | `Melbourne` | source display casing retained |
| Case warning | 43 | `ielts-listening-spelling-2250` | `Morale` | source display casing retained |
| Case warning | 44 | `ielts-listening-spelling-2262` | `North Africa` | source display casing retained |
| Case warning | 44 | `ielts-listening-spelling-2273` | `Olympics` | source display casing retained |
| Case warning | 45 | `ielts-listening-spelling-2305` | `Plato` | source display casing retained |
| Case warning | 47 | `ielts-listening-spelling-2396` | `Slavery` | source display casing retained |
| Case warning | 47 | `ielts-listening-spelling-2427` | `Subtopic` | source display casing retained |
| Case warning | 47 | `ielts-listening-spelling-2436` | `Sweden` | source display casing retained |
| Case warning | 48 | `ielts-listening-spelling-2468` | `Vacate` | source display casing retained |
| Case warning | 48 | `ielts-listening-spelling-2475` | `VCR` | source display casing retained |
| Case warning | 48 | `ielts-listening-spelling-2479` | `Ventilation` | source display casing retained |
| Case warning | 59 | `ielts-toefl-basic-1936` | `Internet` | source display casing retained |
| Note sample | 2 | `ielts-listening-spelling-0013` | `activity` | `activities复数` |
| Note sample | 2 | `ielts-listening-spelling-0024` | `advertise` | `advertising广告业` |
| Note sample | 2 | `ielts-listening-spelling-0051` | `analysis` | `analyses复数` |
| Note sample | 3 | `ielts-listening-spelling-0107` | `badge` | `name badge名牌` |
| Note sample | 4 | `ielts-listening-spelling-0136` | `behavior` | `behaviour英式拼写` |
| Note sample | 4 | `ielts-listening-spelling-0140` | `bicycle` | `bike` |
| Note sample | 4 | `ielts-listening-spelling-0157` | `book` | `booking预定` |
| Note sample | 5 | `ielts-listening-spelling-0172` | `breathe` | `breathing呼吸` |
| Note sample | 5 | `ielts-listening-spelling-0173` | `breed` | `breeding繁殖/饲养` |
| Note sample | 5 | `ielts-listening-spelling-0178` | `broad` | `broader比较级` |
| Note sample | 5 | `ielts-listening-spelling-0181` | `brother-in-law` | `parents-in-law岳父母/公婆` |
| Note sample | 5 | `ielts-listening-spelling-0185` | `build` | `building建造/built造好的` |
| Note sample | 5 | `ielts-listening-spelling-0190` | `bury` | `buried埋葬了的` |
| Note sample | 6 | `ielts-listening-spelling-0231` | `cater` | `cater for招待` |
| Note sample | 6 | `ielts-listening-spelling-0237` | `celebrity` | `celebrities复数` |
| Note sample | 6 | `ielts-listening-spelling-0243` | `chain` | `chain store连锁店` |
| Note sample | 6 | `ielts-listening-spelling-0246` | `challenge` | `challenging有挑战性的` |
| Note sample | 6 | `ielts-listening-spelling-0254` | `check` | `cheque英式拼写` |
| Note sample | 6 | `ielts-listening-spelling-0264` | `children` | `child单数` |
| Note sample | 6 | `ielts-listening-spelling-0266` | `Chinese` | `China` |
| Note sample | 6 | `ielts-listening-spelling-0269` | `choose` | `choosing选择` |
| Note sample | 6 | `ielts-listening-spelling-0272` | `circle` | `circular圆形的` |
| Note sample | 6 | `ielts-listening-spelling-0274` | `city` | `cities复数` |
| Note sample | 6 | `ielts-listening-spelling-0281` | `clean` | `cleaning清洁/cleaned清洁了的` |
| Note sample | 7 | `ielts-listening-spelling-0287` | `climb` | `climbing攀登` |

## Page sentinel sampling

| Book | Source page | Rows | First word | Last word | Result |
| --- | --- | ---: | --- | --- | --- |
| basic | Page 2 | 41 | `precise` | `breath` | pass |
| basic | Page 36 | 42 | `signature` | `experience` | pass |
| basic | Page 37 | 17 | `mine` | `rectangle` | pass |
| basic | Page 61 | 16 | `present` | `freeze` | pass |
| listening | Page 2 | 56 | `absence` | `antifreeze` | pass |
| listening | Page 36 | 7 | `yellow` | `zoom` | pass |
| listening | Page 37 | 45 | `ability` | `boil` | pass |
| listening | Page 49 | 9 | `weigh` | `zoom lens` | pass |

Global boundary sentinels: basic `precise` → `freeze`; listening `absence` → `zoom lens`. All sampled rows are present in source order with stable IDs.
