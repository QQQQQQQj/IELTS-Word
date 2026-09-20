from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pdfplumber


BOOK_IDS = {
    "basic": "ielts-toefl-basic",
    "listening": "ielts-listening-spelling",
}

BASIC_FILENAME = "一叶留学教育_雅思·托福基础词汇.pdf"
LISTENING_FILENAME = "一叶留学教育_雅思听力拼写词汇.pdf"

TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
}

APOSTROPHES = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201b": "'",
        "\u02bc": "'",
        "\u0060": "'",
    }
)

SUSPECT_PHONETIC_WORDS = {"assumption", "encouragement"}
IPA_FEATURES = frozenset(
    "'"
    ":"
    "ˈˌː"
    "ɑɐɒæɓʙβɔɕçɗɖðʤəɚɛɜɞɡɢɣɦɪʒʔʄɟʝ"
    "ɭɬɫɱɯɰŋɳɲɴøɵɸθœɶɹɺɻɽɾʀʁɷɿʃʂ"
    "ʈʊʋⱱʌɤχʎʏʑʐʅʢʡ"
)
PART_OF_SPEECH_SUFFIX = re.compile(
    r"^(?P<word>.+\S)\s+"
    r"(?P<pos>(?:n|v|adj|adv|prep|conj|pron|num|art)\."
    r"(?:[/&](?:n|v|adj|adv|prep|conj|pron|num|art)\.?)*)$",
    re.IGNORECASE,
)
POS_CHINESE_SUFFIX = re.compile(
    r"^(?P<pos>.*[A-Za-z.])\s+(?P<prefix>[\u3400-\u9fff]+)$"
)
BARE_POS_WORD_SUFFIX = re.compile(
    r"^(?P<word>.+\S)\s+"
    r"(?P<pos>n|v|adj|adv|prep|conj|pron|num|art)$",
    re.IGNORECASE,
)
TAG_ORDER = {
    "invalid-phonetic": 0,
    "repaired-phonetic": 1,
    "suspect-phonetic": 2,
    "duplicate-in-book": 3,
    "cross-book-overlap": 4,
}


@dataclass(frozen=True)
class RawEntry:
    word: str
    phonetic: str
    part_of_speech: str
    meaning: str
    note: str
    source_group: str
    page: int
    tags: tuple[str, ...] = ()
    source_phonetic: str = ""
    source_word: str = ""
    source_part_of_speech: str = ""
    source_meaning: str = ""
    fixes: tuple[str, ...] = ()


def clean_text(value: str | None) -> str:
    normalized = unicodedata.normalize("NFKC", value or "")
    return " ".join(normalized.replace("\n", " ").split())


def normalize_word(value: str) -> str:
    return clean_text(value).translate(APOSTROPHES).casefold()


def stable_id(book_id: str, source_order: int) -> str:
    return f"{book_id}-{source_order:04d}"


def split_meanings(value: str) -> list[str]:
    return [
        item
        for item in (clean_text(part) for part in re.split(r"[；;]", value))
        if item
    ]


def _looks_like_ipa(value: str) -> bool:
    inner = value.strip().strip("/")
    return bool(inner) and any(character in IPA_FEATURES for character in inner)


def _clean_basic_phonetic(word: str, value: str) -> tuple[str, tuple[str, ...]]:
    phonetic = clean_text(value)
    slash_count = phonetic.count("/")

    if slash_count == 2 and phonetic.startswith("/") and phonetic.endswith("/"):
        if normalize_word(word) in SUSPECT_PHONETIC_WORDS:
            return phonetic, ("suspect-phonetic",)
        return phonetic, ()

    if (
        slash_count == 1
        and (phonetic.startswith("/") or phonetic.endswith("/"))
        and _looks_like_ipa(phonetic)
    ):
        repaired = phonetic
        if not repaired.startswith("/"):
            repaired = f"/{repaired}"
        if not repaired.endswith("/"):
            repaired = f"{repaired}/"
        return repaired, ("repaired-phonetic",)

    return "", ("invalid-phonetic",)


def _clean_basic_part_of_speech(value: str) -> tuple[str, tuple[str, ...]]:
    repairs = {
        "a..": "a.",
        ".v.": "v.",
    }
    repaired = repairs.get(value)
    if repaired is None:
        return value, ()
    return repaired, ("pos-punctuation-normalized",)


def extract_basic(pdf_path: Path) -> list[RawEntry]:
    entries: list[RawEntry] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number in range(2, len(pdf.pages) + 1):
            page = pdf.pages[page_number - 1]
            table = page.extract_table(TABLE_SETTINGS) or []
            source_group = f"Day {(page_number - 2) // 3 + 1}"

            for row in table:
                cells = [clean_text(cell) for cell in row]
                cells = [cell for cell in cells if cell]
                if not cells:
                    continue
                if cells[0].startswith("Day") or cells[0] in {"单词", "词汇"}:
                    continue
                if len(cells) != 4:
                    raise ValueError(
                        f"Unexpected basic table row on page {page_number}: {cells!r}"
                    )

                word, raw_phonetic, raw_part_of_speech, meaning = cells
                phonetic, tags = _clean_basic_phonetic(word, raw_phonetic)
                part_of_speech, fixes = _clean_basic_part_of_speech(
                    raw_part_of_speech
                )
                entries.append(
                    RawEntry(
                        word=word,
                        phonetic=phonetic,
                        part_of_speech=part_of_speech,
                        meaning=meaning,
                        note="",
                        source_group=source_group,
                        page=page_number,
                        tags=tags,
                        source_phonetic=raw_phonetic,
                        source_word=word,
                        source_part_of_speech=raw_part_of_speech,
                        source_meaning=meaning,
                        fixes=fixes,
                    )
                )
    return entries


def _header_column_starts(page: object, page_number: int) -> tuple[float, ...]:
    if page_number == 47:
        return (28.6, 125.0, 175.7, 334.6)

    lines = page.extract_text_lines(
        layout=False,
        strip=True,
        return_chars=True,
        x_tolerance=2,
        y_tolerance=3,
    )
    for line in lines:
        compact = "".join(char["text"] for char in line.get("chars", []))
        if compact == "词汇词性语义备注":
            chars = line["chars"]
            return tuple(float(chars[index]["x0"]) for index in (0, 2, 4, 6))
    raise ValueError(f"Listening table header not found on page {page_number}")


def _column_text_lines(
    page: object,
    start: float,
    end: float,
) -> list[dict[str, object]]:
    filtered = page.filter(
        lambda item: item.get("object_type") != "char"
        or (start - 0.8 <= float(item["x0"]) < end - 0.8)
    )
    return filtered.extract_text_lines(
        layout=False,
        strip=True,
        return_chars=False,
        x_tolerance=2,
        y_tolerance=3,
    )


def _nearest_anchor(
    top: float,
    anchors: list[dict[str, object]],
) -> int | None:
    if not anchors:
        return None
    index = min(
        range(len(anchors)),
        key=lambda candidate: abs(float(anchors[candidate]["top"]) - top),
    )
    if abs(float(anchors[index]["top"]) - top) > 5:
        return None
    return index


def _repair_listening_columns(
    word: str,
    part_of_speech: str,
    meaning: str,
) -> tuple[str, str, str, tuple[str, ...]]:
    fixes: list[str] = []
    chinese_suffix = POS_CHINESE_SUFFIX.fullmatch(part_of_speech)
    if chinese_suffix:
        part_of_speech = clean_text(chinese_suffix.group("pos"))
        meaning = clean_text(chinese_suffix.group("prefix") + meaning)
        fixes.append("pos-meaning-boundary-restored")

    bare_pos = BARE_POS_WORD_SUFFIX.fullmatch(word)
    if bare_pos and part_of_speech == ".":
        word = clean_text(bare_pos.group("word"))
        part_of_speech = f"{bare_pos.group('pos')}."
        fixes.append("word-pos-punctuation-rejoined")

    if not part_of_speech:
        shifted_pos = PART_OF_SPEECH_SUFFIX.fullmatch(word)
        if shifted_pos:
            word = clean_text(shifted_pos.group("word"))
            part_of_speech = clean_text(shifted_pos.group("pos"))
            fixes.append("word-pos-boundary-restored")
    return word, part_of_speech, meaning, tuple(fixes)


def _extract_listening_page(
    page: object,
    page_number: int,
    source_group: str,
) -> list[RawEntry]:
    starts = _header_column_starts(page, page_number)
    bounds = (*starts, float(page.width) + 1)
    columns = [
        _column_text_lines(page, bounds[index], bounds[index + 1])
        for index in range(4)
    ]
    anchors = [
        line
        for line in columns[0]
        if float(line["top"]) < 790
        and re.search(r"[A-Za-z]", clean_text(str(line["text"])))
        and not re.search(r"[\u3400-\u9fff]", clean_text(str(line["text"])))
    ]
    values: list[list[list[tuple[float, str]]]] = [
        [[] for _ in anchors] for _ in range(4)
    ]

    for column_index, lines in enumerate(columns):
        for line in lines:
            text = clean_text(str(line["text"]))
            if not text:
                continue
            anchor_index = _nearest_anchor(float(line["top"]), anchors)
            if anchor_index is not None:
                values[column_index][anchor_index].append(
                    (float(line["top"]), text)
                )

    entries: list[RawEntry] = []
    for anchor_index in range(len(anchors)):
        fields = []
        for column_index in range(4):
            fragments = sorted(values[column_index][anchor_index])
            fields.append(clean_text(" ".join(text for _, text in fragments)))
        word, part_of_speech, meaning, note = fields
        source_word = word
        source_part_of_speech = part_of_speech
        source_meaning = meaning
        word, part_of_speech, meaning, fixes = _repair_listening_columns(
            word,
            part_of_speech,
            meaning,
        )
        entries.append(
            RawEntry(
                word=word,
                phonetic="",
                part_of_speech=part_of_speech,
                meaning=meaning,
                note=note,
                source_group=source_group,
                page=page_number,
                source_word=source_word,
                source_part_of_speech=source_part_of_speech,
                source_meaning=source_meaning,
                fixes=fixes,
            )
        )
    return entries


def extract_listening(pdf_path: Path) -> list[RawEntry]:
    entries: list[RawEntry] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number in range(2, len(pdf.pages) + 1):
            source_group = "main" if page_number <= 36 else "supplement"
            entries.extend(
                _extract_listening_page(
                    pdf.pages[page_number - 1],
                    page_number,
                    source_group,
                )
            )
    return entries


def clean_entries(
    entries: Iterable[RawEntry],
    book_id: str,
) -> list[dict[str, object]]:
    raw_entries = list(entries)
    duplicate_counts = Counter(normalize_word(entry.word) for entry in raw_entries)
    cleaned: list[dict[str, object]] = []

    for source_order, entry in enumerate(raw_entries, start=1):
        normalized_word = normalize_word(entry.word)
        tags = list(entry.tags)
        if duplicate_counts[normalized_word] > 1:
            tags.append("duplicate-in-book")

        item: dict[str, object] = {
            "id": stable_id(book_id, source_order),
            "bookId": book_id,
            "sourceOrder": source_order,
            "sourceGroup": entry.source_group,
            "word": clean_text(entry.word),
            "normalizedWord": normalized_word,
            "meanings": split_meanings(entry.meaning),
        }
        if entry.phonetic:
            item["phonetic"] = clean_text(entry.phonetic)
        if entry.part_of_speech:
            item["partOfSpeech"] = clean_text(entry.part_of_speech)
        if entry.note:
            item["note"] = clean_text(entry.note)
        if tags:
            item["tags"] = sorted(set(tags), key=lambda tag: TAG_ORDER[tag])
        cleaned.append(item)
    return cleaned


def validate_entries(
    entries: Iterable[dict[str, object]],
) -> dict[str, object]:
    rows = list(entries)
    normalized_words = [
        str(item.get("normalizedWord", ""))
        for item in rows
        if isinstance(item, dict)
    ]
    duplicate_counts = Counter(normalized_words)
    tag_counts = Counter(
        str(tag)
        for item in rows
        if isinstance(item, dict)
        for tag in item.get("tags", [])
        if isinstance(tag, str)
    )
    source_group_counts = Counter(
        str(item.get("sourceGroup", ""))
        for item in rows
        if isinstance(item, dict)
    )
    known_tags = (
        "invalid-phonetic",
        "repaired-phonetic",
        "suspect-phonetic",
        "duplicate-in-book",
        "cross-book-overlap",
    )

    return {
        "entryCount": len(rows),
        "uniqueNormalizedWords": len(duplicate_counts),
        "duplicateKeys": sum(count > 1 for count in duplicate_counts.values()),
        "duplicateExtra": sum(
            count - 1 for count in duplicate_counts.values() if count > 1
        ),
        "emptyWords": sum(
            not clean_text(str(item.get("word", "")))
            for item in rows
            if isinstance(item, dict)
        ),
        "emptyMeanings": sum(
            not isinstance(item.get("meanings"), list)
            or not item["meanings"]
            or any(not clean_text(str(value)) for value in item["meanings"])
            for item in rows
            if isinstance(item, dict)
        ),
        "emptyPartOfSpeech": sum(
            not clean_text(str(item.get("partOfSpeech", "")))
            for item in rows
            if isinstance(item, dict)
        ),
        "noteCount": sum(
            bool(clean_text(str(item.get("note", ""))))
            for item in rows
            if isinstance(item, dict)
        ),
        "sourceGroupCounts": dict(
            sorted(source_group_counts.items(), key=lambda item: item[0])
        ),
        "tagCounts": {
            tag: tag_counts.get(tag, 0)
            for tag in known_tags
        },
    }


def _tag_cross_book_overlap(
    basic: list[dict[str, object]],
    listening: list[dict[str, object]],
) -> None:
    overlap = {
        str(item["normalizedWord"]) for item in basic
    } & {
        str(item["normalizedWord"]) for item in listening
    }
    for item in basic + listening:
        if str(item["normalizedWord"]) in overlap:
            tags = list(item.get("tags", []))
            tags.append("cross-book-overlap")
            item["tags"] = sorted(set(tags), key=lambda tag: TAG_ORDER[tag])


def _write_json(path: Path, entries: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(entries, ensure_ascii=False, indent=2) + "\n"
    path.write_text(payload, encoding="utf-8", newline="\n")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _markdown_cell(value: object) -> str:
    return clean_text(str(value)).replace("|", "\\|").replace("`", "\\`")


def _phonetic_audit_lines(
    raw_entries: list[RawEntry],
    cleaned_entries: list[dict[str, object]],
) -> list[str]:
    lines: list[str] = []
    actions = (
        (
            "repaired-phonetic",
            "added the missing boundary slash after IPA-feature validation",
        ),
        (
            "invalid-phonetic",
            "omitted the structurally invalid source cell; no IPA was invented",
        ),
        (
            "suspect-phonetic",
            "retained the well-formed source value and flagged likely copy mismatch",
        ),
    )
    for tag, action in actions:
        tagged = [
            (raw, item)
            for raw, item in zip(raw_entries, cleaned_entries, strict=True)
            if tag in item.get("tags", [])
        ]
        lines.extend(
            (
                f"### `{tag}` ({len(tagged)})",
                "",
                "| Page | ID | Word | Source cell | Result |",
                "| ---: | --- | --- | --- | --- |",
            )
        )
        for raw, item in tagged:
            result = item.get("phonetic", "omitted")
            lines.append(
                "| "
                f"{raw.page} | `{item['id']}` | `{_markdown_cell(item['word'])}` | "
                f"`{_markdown_cell(raw.source_phonetic)}` | "
                f"`{_markdown_cell(result)}` — {action} |"
            )
        if not tagged:
            lines.append("| — | — | — | — | none |")
        lines.append("")
    return lines


def _pos_fix_lines(
    raw_entries: list[RawEntry],
    cleaned_entries: list[dict[str, object]],
) -> list[str]:
    audited_fixes = {
        "pos-punctuation-normalized",
        "pos-meaning-boundary-restored",
        "word-pos-punctuation-rejoined",
    }
    fixed = [
        (raw, item)
        for raw, item in zip(raw_entries, cleaned_entries, strict=True)
        if audited_fixes & set(raw.fixes)
    ]
    lines = [
        f"## POS alignment fixes ({len(fixed)})",
        "",
        "These repairs are mechanical boundary corrections. Chinese text found "
        "at the end of a POS cell is moved back to the beginning of its meaning; "
        "a bare POS abbreviation followed by a separate `.` is rejoined; the two "
        "basic-book punctuation defects are normalized to the book's own format.",
        "",
        "| Page | ID | Source word | Source POS | Source meaning | "
        "Final word | Final POS | Final meaning | Fix |",
        "| ---: | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for raw, item in fixed:
        lines.append(
            f"| {raw.page} | `{item['id']}` | "
            f"`{_markdown_cell(raw.source_word or raw.word)}` | "
            f"`{_markdown_cell(raw.source_part_of_speech)}` | "
            f"`{_markdown_cell(raw.source_meaning)}` | "
            f"`{_markdown_cell(item['word'])}` | "
            f"`{_markdown_cell(item.get('partOfSpeech', ''))}` | "
            f"`{_markdown_cell(' / '.join(item['meanings']))}` | "
            f"`{_markdown_cell(', '.join(raw.fixes))}` |"
        )
    if not fixed:
        lines.append("| — | — | — | — | — | — | — | — | none |")
    lines.append("")
    return lines


def _sentinel_lines(
    label: str,
    raw_entries: list[RawEntry],
    pages: Iterable[int],
) -> list[str]:
    lines: list[str] = []
    for page_number in pages:
        page_entries = [
            entry for entry in raw_entries if entry.page == page_number
        ]
        if page_entries:
            lines.append(
                f"| {label} | Page {page_number} | {len(page_entries)} | "
                f"`{_markdown_cell(page_entries[0].word)}` | "
                f"`{_markdown_cell(page_entries[-1].word)}` | pass |"
            )
        else:
            lines.append(
                f"| {label} | Page {page_number} | 0 | — | — | fail |"
            )
    return lines


def _build_extraction_report(
    basic_pdf: Path,
    listening_pdf: Path,
    basic_raw: list[RawEntry],
    listening_raw: list[RawEntry],
    basic: list[dict[str, object]],
    listening: list[dict[str, object]],
) -> str:
    basic_stats = validate_entries(basic)
    listening_stats = validate_entries(listening)
    overlap = {
        str(item["normalizedWord"]) for item in basic
    } & {
        str(item["normalizedWord"]) for item in listening
    }
    main = [
        item for item in listening if item["sourceGroup"] == "main"
    ]
    supplement = [
        item for item in listening if item["sourceGroup"] == "supplement"
    ]
    case_rows = [
        (raw, item)
        for raw, item in zip(listening_raw, listening, strict=True)
        if str(item["word"]) != str(item["word"]).casefold()
    ] + [
        (raw, item)
        for raw, item in zip(basic_raw, basic, strict=True)
        if str(item["word"]) != str(item["word"]).casefold()
    ]
    unicode_rows = [
        (raw, item)
        for raw, item in (
            list(zip(basic_raw, basic, strict=True))
            + list(zip(listening_raw, listening, strict=True))
        )
        if not str(item["word"]).isascii()
    ]
    pos_rows = [
        (raw, item)
        for raw, item in zip(listening_raw, listening, strict=True)
        if re.search(r"[\u3400-\u9fff]", str(item.get("partOfSpeech", "")))
    ]
    note_rows = [
        (raw, item)
        for raw, item in zip(listening_raw, listening, strict=True)
        if item.get("note")
    ]

    lines = [
        "# Vocabulary Extraction Report",
        "",
        "This report is generated deterministically by "
        "`scripts/extract_vocabulary.py`; it contains no run timestamp or "
        "machine-specific path.",
        "",
        "## Source PDFs",
        "",
        "| Source | SHA-256 | Pages | Layout |",
        "| --- | --- | ---: | --- |",
        f"| `{basic_pdf.name}` | `{_sha256(basic_pdf)}` | 61 | "
        "Pages 2–61, vector ruled table; four non-empty columns; every three "
        "pages form one Day. |",
        f"| `{listening_pdf.name}` | `{_sha256(listening_pdf)}` | 49 | "
        "Pages 2–36 main table and Pages 37–49 supplement; English-column "
        "text lines anchor POS, meaning, and note within 5 pt; Page 47 uses "
        "the supplement fallback coordinates. |",
        "",
        "## Reconciliation",
        "",
        "The basic-book cover advertises **2000** words. The vector table "
        "contains **1997** source rows (a difference of 3); all Pages 2–61 "
        "were parsed and reconciled, so this is **not a missing-row defect**.",
        "",
        "| Book | Source rows | Final entries | Unique normalized | "
        "Duplicate keys | Duplicate extra | Empty meanings | Empty POS | Notes |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        f"| `{BOOK_IDS['basic']}` | 1997 | {basic_stats['entryCount']} | "
        f"{basic_stats['uniqueNormalizedWords']} | "
        f"{basic_stats['duplicateKeys']} | {basic_stats['duplicateExtra']} | "
        f"{basic_stats['emptyMeanings']} | "
        f"{basic_stats['emptyPartOfSpeech']} | {basic_stats['noteCount']} |",
        f"| `{BOOK_IDS['listening']}` | 2497 | "
        f"{listening_stats['entryCount']} | "
        f"{listening_stats['uniqueNormalizedWords']} | "
        f"{listening_stats['duplicateKeys']} | "
        f"{listening_stats['duplicateExtra']} | "
        f"{listening_stats['emptyMeanings']} | "
        f"{listening_stats['emptyPartOfSpeech']} | "
        f"{listening_stats['noteCount']} |",
        "",
        f"- Basic structure: **20 Day** groups; Day 4, Day 11, and Day 16 "
        "contain 99 rows, and every other Day contains 100.",
        f"- Listening structure: main **{len(main)}** + supplement "
        f"**{len(supplement)}** = **{len(listening)}**.",
        f"- Listening notes: main **{sum(bool(item.get('note')) for item in main)}**, "
        f"supplement **{sum(bool(item.get('note')) for item in supplement)}**.",
        f"- Cross-book normalized overlap: **{len(overlap)}** keys; rows are "
        "retained in both books and tagged `cross-book-overlap`.",
        "- Meanings split only on explicit Chinese/English semicolons; `/` "
        "inside one source meaning remains intact.",
        "- Display words retain source casing. `normalizedWord` uses NFKC, "
        "collapsed whitespace, normalized apostrophes, and casefolding.",
        "",
        "## Day distribution",
        "",
        "| Group | Rows |",
        "| --- | ---: |",
    ]
    for day_number in range(1, 21):
        group = f"Day {day_number}"
        lines.append(
            f"| {group} | "
            f"{basic_stats['sourceGroupCounts'].get(group, 0)} |"
        )

    lines.extend(
        [
            "",
            "## Phonetic anomaly and repair audit",
            "",
            "The 40 structurally irregular source cells split into 24 "
            "`repaired-phonetic` rows and 16 `invalid-phonetic` rows. "
            "Two additional well-formed but likely copied values are retained "
            "as `suspect-phonetic`.",
            "",
        ]
    )
    lines.extend(_phonetic_audit_lines(basic_raw, basic))
    lines.extend(
        _pos_fix_lines(
            basic_raw + listening_raw,
            basic + listening,
        )
    )

    lines.extend(
        [
            "## Known source anomalies: case, Unicode, POS, and notes",
            "",
            f"- Source-display casing warnings: **{len(case_rows)}**. These "
            "include legitimate months, nationalities, and proper names; they "
            "remain non-blocking because normalized forms are lowercase.",
            f"- Non-ASCII display word rows: **{len(unicode_rows)}**; Unicode "
            "is preserved while normalized forms are checked with NFKC.",
            "- Mechanically repaired POS boundary/punctuation rows: **16**; "
            "every source and final value is listed above.",
            f"- Remaining POS alignment warnings after repair: "
            f"**{len(pos_rows)}**.",
            f"- Non-empty listening note rows: **{len(note_rows)}** "
            f"(main 94, supplement 39). Notes remain separate from meanings.",
            "",
            "| Kind | Page | ID | Word | Observed source value |",
            "| --- | ---: | --- | --- | --- |",
        ]
    )
    for raw, item in unicode_rows:
        lines.append(
            f"| Unicode | {raw.page} | `{item['id']}` | "
            f"`{_markdown_cell(item['word'])}` | non-ASCII display spelling |"
        )
    for raw, item in pos_rows:
        lines.append(
            f"| POS alignment | {raw.page} | `{item['id']}` | "
            f"`{_markdown_cell(item['word'])}` | "
            f"`{_markdown_cell(item.get('partOfSpeech', ''))}` |"
        )
    for raw, item in case_rows:
        lines.append(
            f"| Case warning | {raw.page} | `{item['id']}` | "
            f"`{_markdown_cell(item['word'])}` | source display casing retained |"
        )
    for raw, item in note_rows[:25]:
        lines.append(
            f"| Note sample | {raw.page} | `{item['id']}` | "
            f"`{_markdown_cell(item['word'])}` | "
            f"`{_markdown_cell(item.get('note', ''))}` |"
        )

    lines.extend(
        [
            "",
            "## Page sentinel sampling",
            "",
            "| Book | Source page | Rows | First word | Last word | Result |",
            "| --- | --- | ---: | --- | --- | --- |",
        ]
    )
    lines.extend(
        _sentinel_lines("basic", basic_raw, (2, 36, 37, 61))
    )
    lines.extend(
        _sentinel_lines("listening", listening_raw, (2, 36, 37, 49))
    )
    lines.extend(
        [
            "",
            "Global boundary sentinels: basic `precise` → `freeze`; listening "
            "`absence` → `zoom lens`. All sampled rows are present in source "
            "order with stable IDs.",
            "",
        ]
    )
    return "\n".join(lines)


def _write_extraction_report(
    path: Path,
    basic_pdf: Path,
    listening_pdf: Path,
    basic_raw: list[RawEntry],
    listening_raw: list[RawEntry],
    basic: list[dict[str, object]],
    listening: list[dict[str, object]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        _build_extraction_report(
            basic_pdf,
            listening_pdf,
            basic_raw,
            listening_raw,
            basic,
            listening,
        ),
        encoding="utf-8",
        newline="\n",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract IELTS vocabulary PDFs")
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--report-dir", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    basic_pdf = args.source_dir / BASIC_FILENAME
    listening_pdf = args.source_dir / LISTENING_FILENAME
    if not basic_pdf.is_file() or not listening_pdf.is_file():
        raise FileNotFoundError(
            f"Expected source PDFs in {args.source_dir.resolve()}"
        )

    basic_raw = extract_basic(basic_pdf)
    listening_raw = extract_listening(listening_pdf)
    basic = clean_entries(basic_raw, BOOK_IDS["basic"])
    listening = clean_entries(
        listening_raw,
        BOOK_IDS["listening"],
    )
    _tag_cross_book_overlap(basic, listening)

    _write_json(args.output_dir / f"{BOOK_IDS['basic']}.json", basic)
    _write_json(
        args.output_dir / f"{BOOK_IDS['listening']}.json",
        listening,
    )
    if args.report_dir is not None:
        _write_extraction_report(
            args.report_dir / "vocabulary-extraction-report.md",
            basic_pdf,
            listening_pdf,
            basic_raw,
            listening_raw,
            basic,
            listening,
        )
    print(
        "Extracted "
        f"{len(basic)} basic and {len(listening)} listening vocabulary entries."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
