from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


BASIC_BOOK_ID = "ielts-toefl-basic"
LISTENING_BOOK_ID = "ielts-listening-spelling"
BOOK_FILES = {
    BASIC_BOOK_ID: "ielts-toefl-basic.json",
    LISTENING_BOOK_ID: "ielts-listening-spelling.json",
}
EXPECTED_COUNTS = {
    BASIC_BOOK_ID: 1997,
    LISTENING_BOOK_ID: 2497,
}
EXPECTED_DAY_COUNTS = {
    f"Day {number}": 99 if number in {4, 11, 16} else 100
    for number in range(1, 21)
}
EXPECTED_LISTENING_GROUPS = {"main": 1937, "supplement": 560}
REQUIRED_FIELDS = {
    "id",
    "bookId",
    "sourceOrder",
    "sourceGroup",
    "word",
    "normalizedWord",
    "meanings",
}
OPTIONAL_FIELDS = {"phonetic", "partOfSpeech", "note", "tags"}
ALLOWED_TAGS = {
    "invalid-phonetic",
    "repaired-phonetic",
    "suspect-phonetic",
    "duplicate-in-book",
    "cross-book-overlap",
}
HEADER_WORDS = {
    "单词",
    "词汇",
    "音标",
    "词性",
    "语义",
    "释义",
    "备注",
    "雅思听力拼写词汇",
    "2026雅思听力拼写词汇——增补",
}
HIDDEN_CHARACTERS = re.compile(
    r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b-\u200f"
    r"\u202a-\u202e\u2060\ufeff]"
)
CJK = re.compile(r"[\u3400-\u9fff]")
PAGE_NUMBER = re.compile(r"^\d+(?:/\d+)?$")
GARBLED = re.compile(r"�|(?:[^\w\s\u3400-\u9fff]){8,}")
MEANING_WORD_BLEED = re.compile(
    r"^[A-Za-z][A-Za-z' -]{2,}\s+[\u3400-\u9fff]"
)
APOSTROPHES = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201b": "'",
        "\u02bc": "'",
        "\u0060": "'",
    }
)

CHECK_SEVERITIES = {
    "schema_type": "blocking",
    "identity_and_order": "blocking",
    "expected_counts": "blocking",
    "missing_source_group": "blocking",
    "empty_word": "blocking",
    "empty_meaning": "blocking",
    "header_or_page_number": "blocking",
    "whitespace": "blocking",
    "unicode_normalization": "blocking",
    "case_anomaly": "warning",
    "broken_word_or_line": "warning",
    "phonetic_misalignment": "blocking",
    "part_of_speech_misalignment": "warning",
    "note_split": "warning",
    "overlong_text": "warning",
    "suspected_garbled_text": "blocking",
    "row_boundary_leakage": "blocking",
    "duplicate_within_book": "info",
    "duplicate_across_books": "info",
    "tag_consistency": "blocking",
    "known_sentinels": "blocking",
    "known_source_anomalies": "info",
}

# Independent audit result: source display words that keep an uppercase
# first letter without a proper-noun or acronym justification. Display
# words retain the source PDF casing, so these stay unfixed warnings.
SUSPECT_UPPERCASE_WORDS = {
    "Accommodation",
    "Comparative",
    "Empathy",
    "Enclosure",
    "Font",
    "Hazel",
    "Malaria",
    "Morale",
    "Slavery",
    "Subtopic",
    "Vacate",
    "Ventilation",
}


def clean_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return " ".join(normalized.replace("\n", " ").split())


def normalize_word(value: str) -> str:
    return clean_text(value).translate(APOSTROPHES).casefold()


def issue(
    book_id: str,
    message: str,
    entry: dict[str, Any] | None = None,
    **details: object,
) -> dict[str, object]:
    item: dict[str, object] = {
        "bookId": book_id,
        "message": message,
    }
    if entry is not None:
        if isinstance(entry.get("id"), str):
            item["id"] = entry["id"]
        if isinstance(entry.get("word"), str):
            item["word"] = entry["word"]
    item.update(details)
    return item


def all_strings(value: object) -> Iterable[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from all_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from all_strings(item)


def load_book(
    data_dir: Path,
    book_id: str,
    issues: dict[str, list[dict[str, object]]],
) -> list[object]:
    path = data_dir / BOOK_FILES[book_id]
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        issues["schema_type"].append(
            issue(book_id, "unable to load canonical JSON", error=str(error))
        )
        return []
    if not isinstance(payload, list):
        issues["schema_type"].append(
            issue(book_id, "top-level JSON value must be an array")
        )
        return []
    return payload


def validate_schema(
    book_id: str,
    rows: list[object],
    issues: dict[str, list[dict[str, object]]],
) -> list[dict[str, Any]]:
    valid_rows: list[dict[str, Any]] = []
    allowed_fields = REQUIRED_FIELDS | OPTIONAL_FIELDS
    for index, raw_entry in enumerate(rows, start=1):
        if not isinstance(raw_entry, dict):
            issues["schema_type"].append(
                issue(
                    book_id,
                    "entry must be an object",
                    sourceOrder=index,
                    actualType=type(raw_entry).__name__,
                )
            )
            continue
        entry = raw_entry
        valid_rows.append(entry)
        missing = sorted(REQUIRED_FIELDS - entry.keys())
        extra = sorted(entry.keys() - allowed_fields)
        if missing:
            issues["schema_type"].append(
                issue(book_id, "missing required fields", entry, fields=missing)
            )
        if extra:
            issues["schema_type"].append(
                issue(book_id, "unknown fields are not allowed", entry, fields=extra)
            )

        string_fields = (
            "id",
            "bookId",
            "sourceGroup",
            "word",
            "normalizedWord",
        )
        for field in string_fields:
            if field in entry and not isinstance(entry[field], str):
                issues["schema_type"].append(
                    issue(
                        book_id,
                        f"{field} must be a string",
                        entry,
                        field=field,
                        actualType=type(entry[field]).__name__,
                    )
                )
        if "sourceOrder" in entry and (
            not isinstance(entry["sourceOrder"], int)
            or isinstance(entry["sourceOrder"], bool)
        ):
            issues["schema_type"].append(
                issue(book_id, "sourceOrder must be an integer", entry)
            )
        for field in ("phonetic", "partOfSpeech", "note"):
            if field in entry and (
                not isinstance(entry[field], str) or not entry[field]
            ):
                issues["schema_type"].append(
                    issue(
                        book_id,
                        f"{field} must be a non-empty string when present",
                        entry,
                    )
                )
        meanings = entry.get("meanings")
        if not isinstance(meanings, list) or any(
            not isinstance(value, str) for value in meanings
        ):
            issues["schema_type"].append(
                issue(book_id, "meanings must be an array of strings", entry)
            )
        tags = entry.get("tags")
        if tags is not None:
            if (
                not isinstance(tags, list)
                or any(not isinstance(tag, str) for tag in tags)
                or len(tags) != len(set(tags))
                or any(tag not in ALLOWED_TAGS for tag in tags)
            ):
                issues["schema_type"].append(
                    issue(
                        book_id,
                        "tags must be unique known strings",
                        entry,
                    )
                )
    return valid_rows


def validate_rows(
    book_id: str,
    raw_rows: list[object],
    rows: list[dict[str, Any]],
    issues: dict[str, list[dict[str, object]]],
) -> None:
    expected_count = EXPECTED_COUNTS[book_id]
    if len(raw_rows) != expected_count:
        issues["expected_counts"].append(
            issue(
                book_id,
                "entry count differs from canonical source-row count",
                expected=expected_count,
                actual=len(raw_rows),
            )
        )

    for expected_order, entry in enumerate(rows, start=1):
        expected_id = f"{book_id}-{expected_order:04d}"
        if (
            entry.get("sourceOrder") != expected_order
            or entry.get("id") != expected_id
            or entry.get("bookId") != book_id
        ):
            issues["identity_and_order"].append(
                issue(
                    book_id,
                    "stable ID, source order, or bookId mismatch",
                    entry,
                    expectedId=expected_id,
                    expectedSourceOrder=expected_order,
                )
            )

        word = entry.get("word")
        normalized = entry.get("normalizedWord")
        meanings = entry.get("meanings")
        phonetic = entry.get("phonetic")
        part_of_speech = entry.get("partOfSpeech")
        note = entry.get("note")
        tags = entry.get("tags", [])
        if not isinstance(tags, list):
            tags = []

        if not isinstance(word, str) or not word.strip():
            issues["empty_word"].append(
                issue(book_id, "word is empty", entry)
            )
        if (
            not isinstance(meanings, list)
            or not meanings
            or any(not isinstance(value, str) or not value.strip() for value in meanings)
        ):
            issues["empty_meaning"].append(
                issue(book_id, "meanings must contain non-empty strings", entry)
            )

        if isinstance(word, str):
            if word in HEADER_WORDS or PAGE_NUMBER.fullmatch(word):
                issues["header_or_page_number"].append(
                    issue(book_id, "header or page number leaked into word", entry)
                )
            if CJK.search(word):
                issues["row_boundary_leakage"].append(
                    issue(book_id, "Chinese text leaked into the English word", entry)
                )
            if word != " ".join(word.split()) or word != word.strip():
                issues["whitespace"].append(
                    issue(book_id, "word whitespace is not canonical", entry)
                )
            if word != unicodedata.normalize("NFKC", word):
                issues["unicode_normalization"].append(
                    issue(book_id, "word is not NFKC normalized", entry)
                )
            if isinstance(normalized, str) and normalized != normalize_word(word):
                issues["unicode_normalization"].append(
                    issue(
                        book_id,
                        "normalizedWord does not match canonical normalization",
                        entry,
                        expected=normalize_word(word),
                    )
                )
            if word != word.casefold() and word in SUSPECT_UPPERCASE_WORDS:
                issues["case_anomaly"].append(
                    issue(
                        book_id,
                        "suspected unjustified uppercase kept from the source",
                        entry,
                        normalizedWord=normalized,
                    )
                )
            allowed_punctuation = set(" '-()/&.,")
            if (
                not word
                or not word[0].isalpha()
                or any(
                    not character.isalpha()
                    and not character.isdigit()
                    and character not in allowed_punctuation
                    for character in word
                )
                or word.count("(") != word.count(")")
            ):
                issues["broken_word_or_line"].append(
                    issue(book_id, "word head or line shape is suspicious", entry)
                )

        for value in all_strings(entry):
            if HIDDEN_CHARACTERS.search(value):
                issues["unicode_normalization"].append(
                    issue(book_id, "hidden/control Unicode character found", entry)
                )
                break

        if phonetic is not None and (
            not isinstance(phonetic, str)
            or not phonetic.startswith("/")
            or not phonetic.endswith("/")
            or phonetic.count("/") != 2
        ):
            issues["phonetic_misalignment"].append(
                issue(book_id, "phonetic value is structurally invalid", entry)
            )
        if "invalid-phonetic" in tags and phonetic is not None:
            issues["phonetic_misalignment"].append(
                issue(
                    book_id,
                    "invalid-phonetic row must not expose a fabricated phonetic",
                    entry,
                )
            )
        if (
            {"repaired-phonetic", "suspect-phonetic"} & set(tags)
            and not isinstance(phonetic, str)
        ):
            issues["phonetic_misalignment"].append(
                issue(book_id, "phonetic audit tag requires a retained value", entry)
            )

        if isinstance(part_of_speech, str) and (
            CJK.search(part_of_speech)
            or not re.search(r"[A-Za-z]", part_of_speech)
            or part_of_speech.startswith(".")
            or ".." in part_of_speech
        ):
            issues["part_of_speech_misalignment"].append(
                issue(
                    book_id,
                    "part-of-speech cell is malformed or contains meaning text",
                    entry,
                    value=part_of_speech,
                )
            )

        if isinstance(note, str):
            meaning_values = meanings if isinstance(meanings, list) else []
            if book_id == BASIC_BOOK_ID or any(
                isinstance(value, str)
                and normalize_word(word or "") in normalize_word(note)
                and value in note
                for value in meaning_values
            ):
                issues["note_split"].append(
                    issue(
                        book_id,
                        "note may duplicate a word/meaning cell",
                        entry,
                        value=note,
                    )
                )

        lengths = {
            "word": len(word) if isinstance(word, str) else 0,
            "phonetic": len(phonetic) if isinstance(phonetic, str) else 0,
            "partOfSpeech": (
                len(part_of_speech) if isinstance(part_of_speech, str) else 0
            ),
            "note": len(note) if isinstance(note, str) else 0,
            "meaning": max(
                (
                    len(value)
                    for value in meanings
                    if isinstance(value, str)
                ),
                default=0,
            )
            if isinstance(meanings, list)
            else 0,
        }
        limits = {
            "word": 80,
            "phonetic": 80,
            "partOfSpeech": 40,
            "note": 300,
            "meaning": 300,
        }
        exceeded = {
            field: length
            for field, length in lengths.items()
            if length > limits[field]
        }
        if exceeded:
            issues["overlong_text"].append(
                issue(book_id, "text exceeds audit threshold", entry, lengths=exceeded)
            )

        if any(GARBLED.search(value) for value in all_strings(entry)):
            issues["suspected_garbled_text"].append(
                issue(book_id, "replacement or garbled text pattern found", entry)
            )
        if isinstance(meanings, list) and any(
            isinstance(value, str) and MEANING_WORD_BLEED.search(value)
            for value in meanings
        ):
            issues["row_boundary_leakage"].append(
                issue(
                    book_id,
                    "meaning may contain text from an adjacent English row",
                    entry,
                )
            )


def validate_source_groups(
    books: dict[str, list[dict[str, Any]]],
    issues: dict[str, list[dict[str, object]]],
) -> None:
    basic_groups = Counter(
        entry.get("sourceGroup") for entry in books[BASIC_BOOK_ID]
    )
    listening_groups = Counter(
        entry.get("sourceGroup") for entry in books[LISTENING_BOOK_ID]
    )
    for group, expected in EXPECTED_DAY_COUNTS.items():
        actual = basic_groups.get(group, 0)
        if actual != expected:
            issues["missing_source_group"].append(
                issue(
                    BASIC_BOOK_ID,
                    "Day group is missing or has the wrong row count",
                    group=group,
                    expected=expected,
                    actual=actual,
                )
            )
    unexpected_basic = sorted(
        str(group) for group in basic_groups if group not in EXPECTED_DAY_COUNTS
    )
    if unexpected_basic:
        issues["missing_source_group"].append(
            issue(
                BASIC_BOOK_ID,
                "unexpected source groups found",
                groups=unexpected_basic,
            )
        )
    for group, expected in EXPECTED_LISTENING_GROUPS.items():
        actual = listening_groups.get(group, 0)
        if actual != expected:
            issues["missing_source_group"].append(
                issue(
                    LISTENING_BOOK_ID,
                    "listening section has the wrong row count",
                    group=group,
                    expected=expected,
                    actual=actual,
                )
            )
    unexpected_listening = sorted(
        str(group)
        for group in listening_groups
        if group not in EXPECTED_LISTENING_GROUPS
    )
    if unexpected_listening:
        issues["missing_source_group"].append(
            issue(
                LISTENING_BOOK_ID,
                "unexpected source groups found",
                groups=unexpected_listening,
            )
        )


def duplicate_details(
    book_id: str,
    rows: list[dict[str, Any]],
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for entry in rows:
        normalized = entry.get("normalizedWord")
        if isinstance(normalized, str):
            grouped.setdefault(normalized, []).append(entry)
    duplicates: list[dict[str, object]] = []
    tag_issues: list[dict[str, object]] = []
    for normalized, entries in sorted(grouped.items()):
        should_tag = len(entries) > 1
        if should_tag:
            duplicates.append(
                {
                    "bookId": book_id,
                    "normalizedWord": normalized,
                    "rowCount": len(entries),
                    "ids": [entry.get("id") for entry in entries],
                }
            )
        for entry in entries:
            tags = entry.get("tags", [])
            has_tag = (
                isinstance(tags, list) and "duplicate-in-book" in tags
            )
            if has_tag != should_tag:
                tag_issues.append(
                    issue(
                        book_id,
                        "duplicate-in-book tag is inconsistent",
                        entry,
                        normalizedWord=normalized,
                        expectedTag=should_tag,
                    )
                )
    return duplicates, tag_issues


def validate_cross_book(
    books: dict[str, list[dict[str, Any]]],
    issues: dict[str, list[dict[str, object]]],
) -> set[str]:
    normalized_sets = {
        book_id: {
            str(entry["normalizedWord"])
            for entry in rows
            if isinstance(entry.get("normalizedWord"), str)
        }
        for book_id, rows in books.items()
    }
    overlap = (
        normalized_sets[BASIC_BOOK_ID]
        & normalized_sets[LISTENING_BOOK_ID]
    )
    issues["duplicate_across_books"].extend(
        {
            "normalizedWord": normalized,
            "bookIds": [BASIC_BOOK_ID, LISTENING_BOOK_ID],
        }
        for normalized in sorted(overlap)
    )
    for book_id, rows in books.items():
        for entry in rows:
            normalized = entry.get("normalizedWord")
            tags = entry.get("tags", [])
            has_tag = (
                isinstance(tags, list) and "cross-book-overlap" in tags
            )
            should_tag = isinstance(normalized, str) and normalized in overlap
            if has_tag != should_tag:
                issues["tag_consistency"].append(
                    issue(
                        book_id,
                        "cross-book-overlap tag is inconsistent",
                        entry,
                        expectedTag=should_tag,
                    )
                )
    return overlap


def validate_sentinels(
    books: dict[str, list[dict[str, Any]]],
    issues: dict[str, list[dict[str, object]]],
) -> None:
    expected = (
        (BASIC_BOOK_ID, 0, "precise"),
        (BASIC_BOOK_ID, 1996, "freeze"),
        (LISTENING_BOOK_ID, 0, "absence"),
        (LISTENING_BOOK_ID, 1936, "zoom"),
        (LISTENING_BOOK_ID, 1937, "ability"),
        (LISTENING_BOOK_ID, 2496, "zoom lens"),
    )
    for book_id, index, word in expected:
        rows = books[book_id]
        actual = rows[index].get("word") if index < len(rows) else None
        if actual != word:
            issues["known_sentinels"].append(
                issue(
                    book_id,
                    "known source-order sentinel mismatch",
                    expectedWord=word,
                    actualWord=actual,
                    sourceOrder=index + 1,
                )
            )


def book_statistics(rows: list[dict[str, Any]]) -> dict[str, object]:
    normalized = [
        str(entry.get("normalizedWord", "")) for entry in rows
    ]
    counts = Counter(normalized)
    tags = Counter(
        tag
        for entry in rows
        for tag in entry.get("tags", [])
        if isinstance(tag, str)
    )
    groups = Counter(str(entry.get("sourceGroup", "")) for entry in rows)
    return {
        "entryCount": len(rows),
        "uniqueNormalizedWords": len(counts),
        "duplicateKeys": sum(count > 1 for count in counts.values()),
        "duplicateExtra": sum(
            count - 1 for count in counts.values() if count > 1
        ),
        "emptyWords": sum(
            not isinstance(entry.get("word"), str)
            or not entry["word"].strip()
            for entry in rows
        ),
        "emptyMeanings": sum(
            not isinstance(entry.get("meanings"), list)
            or not entry["meanings"]
            for entry in rows
        ),
        "emptyPartOfSpeech": sum(
            not isinstance(entry.get("partOfSpeech"), str)
            or not entry["partOfSpeech"].strip()
            for entry in rows
        ),
        "noteCount": sum(bool(entry.get("note")) for entry in rows),
        "sourceGroupCounts": dict(sorted(groups.items())),
        "repairedPhonetic": tags["repaired-phonetic"],
        "invalidPhonetic": tags["invalid-phonetic"],
        "suspectPhonetic": tags["suspect-phonetic"],
    }


def make_check(
    name: str,
    items: list[dict[str, object]],
    *,
    detected: int | None = None,
    fixed: int = 0,
    remaining: int | None = None,
) -> dict[str, object]:
    detected_count = len(items) if detected is None else detected
    remaining_count = len(items) if remaining is None else remaining
    return {
        "severity": CHECK_SEVERITIES[name],
        "count": detected_count,
        "detected": detected_count,
        "fixed": fixed,
        "remaining": remaining_count,
        "items": items,
        "samples": items[:20],
    }


def validate_data_dir(data_dir: Path) -> dict[str, object]:
    issue_lists: dict[str, list[dict[str, object]]] = {
        name: [] for name in CHECK_SEVERITIES
    }
    raw_books = {
        book_id: load_book(data_dir, book_id, issue_lists)
        for book_id in BOOK_FILES
    }
    books = {
        book_id: validate_schema(book_id, raw_books[book_id], issue_lists)
        for book_id in BOOK_FILES
    }
    for book_id in BOOK_FILES:
        validate_rows(
            book_id,
            raw_books[book_id],
            books[book_id],
            issue_lists,
        )
    validate_source_groups(books, issue_lists)

    duplicate_key_count = 0
    duplicate_extra_count = 0
    for book_id, rows in books.items():
        duplicates, tag_issues = duplicate_details(book_id, rows)
        issue_lists["duplicate_within_book"].extend(duplicates)
        issue_lists["tag_consistency"].extend(tag_issues)
        duplicate_key_count += len(duplicates)
        duplicate_extra_count += sum(
            int(item["rowCount"]) - 1 for item in duplicates
        )
    overlap = validate_cross_book(books, issue_lists)
    validate_sentinels(books, issue_lists)

    basic_stats = book_statistics(books[BASIC_BOOK_ID])
    listening_stats = book_statistics(books[LISTENING_BOOK_ID])
    known_source_items = [
        {
            "bookId": BASIC_BOOK_ID,
            "message": "cover label 2000 differs from 1997 vector-table rows",
            "detected": 3,
            "disposition": "reconciled source fact; not a missing-row defect",
        },
        {
            "bookId": BASIC_BOOK_ID,
            "message": "one-sided IPA boundary repaired",
            "detected": basic_stats["repairedPhonetic"],
        },
        {
            "bookId": BASIC_BOOK_ID,
            "message": "invalid phonetic source cell omitted and tagged",
            "detected": basic_stats["invalidPhonetic"],
        },
        {
            "bookId": BASIC_BOOK_ID,
            "message": "well-formed copied phonetic retained as suspect",
            "detected": basic_stats["suspectPhonetic"],
        },
        {
            "bookId": LISTENING_BOOK_ID,
            "message": "empty source part-of-speech is allowed and reported",
            "detected": listening_stats["emptyPartOfSpeech"],
        },
        {
            "bookId": "both",
            "message": "mechanical POS boundary/punctuation repair applied",
            "detected": 16,
        },
    ]
    issue_lists["known_source_anomalies"].extend(known_source_items)

    source_uppercase_count = sum(
        1
        for rows in books.values()
        for entry in rows
        if isinstance(entry.get("word"), str)
        and entry["word"] != entry["word"].casefold()
    )
    suspect_uppercase_count = len(issue_lists["case_anomaly"])

    phonetic_remaining = len(issue_lists["phonetic_misalignment"])
    phonetic_detected = (
        int(basic_stats["repairedPhonetic"])
        + int(basic_stats["invalidPhonetic"])
        + phonetic_remaining
    )
    checks: dict[str, dict[str, object]] = {}
    for name, items in issue_lists.items():
        if name == "phonetic_misalignment":
            checks[name] = make_check(
                name,
                items,
                detected=phonetic_detected,
                fixed=(
                    int(basic_stats["repairedPhonetic"])
                    + int(basic_stats["invalidPhonetic"])
                ),
                remaining=phonetic_remaining,
            )
        elif name == "case_anomaly":
            # Display words keep the source PDF casing on purpose, so
            # suspected anomalies stay unfixed; normalizedWord casefolding
            # is a derived field and is not reported as a display fix.
            checks[name] = make_check(
                name,
                items,
                detected=suspect_uppercase_count,
                fixed=0,
                remaining=suspect_uppercase_count,
            )
            checks[name]["sourceUppercaseCount"] = source_uppercase_count
            checks[name]["acceptedProperOrAcronymCount"] = (
                source_uppercase_count - suspect_uppercase_count
            )
        elif name == "part_of_speech_misalignment":
            checks[name] = make_check(
                name,
                items,
                detected=16 + len(items),
                fixed=16,
                remaining=len(items),
            )
        elif name == "duplicate_within_book":
            checks[name] = make_check(
                name,
                items,
                detected=duplicate_extra_count,
                fixed=0,
                remaining=duplicate_extra_count,
            )
            checks[name]["duplicateKeyCount"] = duplicate_key_count
            checks[name]["duplicateExtraCount"] = duplicate_extra_count
        elif name == "duplicate_across_books":
            checks[name] = make_check(
                name,
                items,
                detected=len(overlap),
                fixed=0,
                remaining=len(overlap),
            )
        else:
            checks[name] = make_check(name, items)

    known_detected = sum(
        int(item.get("detected", 0)) for item in known_source_items
    )
    checks["known_source_anomalies"]["detected"] = known_detected
    checks["known_source_anomalies"]["count"] = known_detected
    checks["known_source_anomalies"]["fixed"] = (
        int(basic_stats["repairedPhonetic"])
        + int(basic_stats["invalidPhonetic"])
        + 16
    )
    checks["known_source_anomalies"]["remaining"] = (
        int(basic_stats["suspectPhonetic"])
        + int(listening_stats["emptyPartOfSpeech"])
    )

    blocking_error_count = sum(
        int(check["remaining"])
        for check in checks.values()
        if check["severity"] == "blocking"
    )
    warning_count = sum(
        int(check["detected"])
        for check in checks.values()
        if check["severity"] == "warning"
    )
    total_entries = len(books[BASIC_BOOK_ID]) + len(
        books[LISTENING_BOOK_ID]
    )
    report = {
        "schemaVersion": 1,
        "status": "pass" if blocking_error_count == 0 else "fail",
        "blockingErrorCount": blocking_error_count,
        "warningCount": warning_count,
        "totals": {
            "sourceRows": total_entries,
            "finalEntries": total_entries,
            "emptyWords": (
                int(basic_stats["emptyWords"])
                + int(listening_stats["emptyWords"])
            ),
            "emptyMeanings": (
                int(basic_stats["emptyMeanings"])
                + int(listening_stats["emptyMeanings"])
            ),
        },
        "books": {
            BASIC_BOOK_ID: basic_stats,
            LISTENING_BOOK_ID: listening_stats,
        },
        "crossBook": {
            "normalizedOverlap": len(overlap),
            "taggedBasicRows": sum(
                "cross-book-overlap" in entry.get("tags", [])
                for entry in books[BASIC_BOOK_ID]
            ),
            "taggedListeningRows": sum(
                "cross-book-overlap" in entry.get("tags", [])
                for entry in books[LISTENING_BOOK_ID]
            ),
        },
        "checks": checks,
    }
    return report


def write_report(path: Path, report: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Strictly validate extracted IELTS vocabulary JSON"
    )
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        report = validate_data_dir(args.data_dir)
    except Exception as error:  # Keep the CLI report-producing contract.
        empty_issues = {
            name: make_check(
                name,
                [
                    {
                        "bookId": "validator",
                        "message": "unexpected validator failure",
                        "error": str(error),
                    }
                ]
                if name == "schema_type"
                else [],
            )
            for name in CHECK_SEVERITIES
        }
        report = {
            "schemaVersion": 1,
            "status": "fail",
            "blockingErrorCount": 1,
            "warningCount": 0,
            "totals": {
                "sourceRows": 0,
                "finalEntries": 0,
                "emptyWords": 0,
                "emptyMeanings": 0,
            },
            "books": {
                book_id: {"entryCount": 0} for book_id in BOOK_FILES
            },
            "crossBook": {
                "normalizedOverlap": 0,
                "taggedBasicRows": 0,
                "taggedListeningRows": 0,
            },
            "checks": empty_issues,
        }
    write_report(args.report, report)
    print(
        f"Validated {report['totals']['finalEntries']} entries: "
        f"{report['status']} "
        f"({report['blockingErrorCount']} blocking errors)."
    )
    return 0 if report["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
