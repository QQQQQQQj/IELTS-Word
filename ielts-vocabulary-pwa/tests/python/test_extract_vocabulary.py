from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Callable


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = PROJECT_ROOT.parent
EXTRACT_SCRIPT = PROJECT_ROOT / "scripts" / "extract_vocabulary.py"
VALIDATE_SCRIPT = PROJECT_ROOT / "scripts" / "validate_vocabulary.py"
CHECKED_IN_DATA_DIR = PROJECT_ROOT / "src" / "data" / "books"
CHECKED_IN_REPORT_DIR = PROJECT_ROOT / "reports"

BASIC_BOOK_ID = "ielts-toefl-basic"
LISTENING_BOOK_ID = "ielts-listening-spelling"

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
import extract_vocabulary as extraction
from extract_vocabulary import _clean_basic_phonetic, split_meanings


class VocabularyExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_root = Path(tempfile.mkdtemp(prefix="ielts-vocabulary-test-"))
        cls.output_dir = cls.temp_root / "books"
        cls.report_dir = cls.temp_root / "reports"
        cls._extract_result: subprocess.CompletedProcess[str] | None = None

    @classmethod
    def tearDownClass(cls) -> None:
        shutil.rmtree(cls.temp_root, ignore_errors=True)

    def run_extraction(self) -> None:
        if self.__class__._extract_result is None:
            self.__class__._extract_result = subprocess.run(
                [
                    sys.executable,
                    str(EXTRACT_SCRIPT),
                    "--source-dir",
                    str(SOURCE_DIR),
                    "--output-dir",
                    str(self.output_dir),
                    "--report-dir",
                    str(self.report_dir),
                ],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False,
            )

        result = self.__class__._extract_result
        self.assertEqual(
            result.returncode,
            0,
            msg=f"extraction failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}",
        )

    def load_outputs(self) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
        self.run_extraction()
        basic = json.loads(
            (self.output_dir / f"{BASIC_BOOK_ID}.json").read_text(encoding="utf-8")
        )
        listening = json.loads(
            (self.output_dir / f"{LISTENING_BOOK_ID}.json").read_text(encoding="utf-8")
        )
        return basic, listening

    def run_validation(
        self,
        data_dir: Path,
        report_path: Path,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                str(VALIDATE_SCRIPT),
                "--data-dir",
                str(data_dir),
                "--report",
                str(report_path),
            ],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )

    def validate_corrupted_fixture(
        self,
        slug: str,
        mutate: Callable[
            [list[dict[str, object]], list[dict[str, object]]],
            None,
        ],
    ) -> dict[str, object]:
        basic, listening = self.load_outputs()
        fixture_dir = self.temp_root / f"corrupt-{slug}"
        fixture_dir.mkdir(parents=True, exist_ok=True)
        mutate(basic, listening)
        (fixture_dir / f"{BASIC_BOOK_ID}.json").write_text(
            json.dumps(basic, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )
        (fixture_dir / f"{LISTENING_BOOK_ID}.json").write_text(
            json.dumps(listening, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )
        report_path = self.temp_root / f"validation-{slug}.json"
        result = self.run_validation(fixture_dir, report_path)
        self.assertNotEqual(
            result.returncode,
            0,
            msg=f"corrupt fixture unexpectedly passed\nstdout:\n{result.stdout}",
        )
        self.assertTrue(report_path.is_file(), result.stderr)
        report = json.loads(report_path.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "fail")
        self.assertGreater(report["blockingErrorCount"], 0)
        return report

    def test_extracts_expected_rows_groups_and_sentinels(self) -> None:
        basic, listening = self.load_outputs()

        self.assertEqual(len(basic), 1997)
        self.assertEqual(
            {item["sourceGroup"] for item in basic},
            {f"Day {number}" for number in range(1, 21)},
        )
        self.assertEqual(basic[0]["word"], "precise")
        self.assertEqual(basic[-1]["word"], "freeze")

        self.assertEqual(len(listening), 2497)
        self.assertEqual(
            sum(item["sourceGroup"] == "main" for item in listening),
            1937,
        )
        self.assertEqual(
            sum(item["sourceGroup"] == "supplement" for item in listening),
            560,
        )
        self.assertEqual(listening[0]["word"], "absence")
        self.assertEqual(listening[-1]["word"], "zoom lens")

    def test_emits_complete_schema_stable_ids_and_nonempty_meanings(self) -> None:
        basic, listening = self.load_outputs()
        required = {
            "id",
            "bookId",
            "sourceOrder",
            "sourceGroup",
            "word",
            "normalizedWord",
            "meanings",
        }

        for book_id, entries in (
            (BASIC_BOOK_ID, basic),
            (LISTENING_BOOK_ID, listening),
        ):
            for source_order, item in enumerate(entries, start=1):
                self.assertTrue(required <= item.keys())
                self.assertEqual(item["id"], f"{book_id}-{source_order:04d}")
                self.assertEqual(item["bookId"], book_id)
                self.assertEqual(item["sourceOrder"], source_order)
                self.assertTrue(str(item["word"]).strip())
                self.assertTrue(str(item["normalizedWord"]).strip())
                self.assertIsInstance(item["meanings"], list)
                self.assertTrue(item["meanings"])
                self.assertTrue(all(str(value).strip() for value in item["meanings"]))

        basic_by_word = {item["normalizedWord"]: item for item in basic}
        listening_by_word = {
            item["normalizedWord"]: item for item in listening
        }
        self.assertEqual(
            basic_by_word["subject"]["meanings"],
            ["(研究/讨论)主题/对象", "科目", "[语]主语"],
        )
        self.assertEqual(
            basic_by_word["topic"]["meanings"],
            ["主题", "话题,论题"],
        )
        self.assertEqual(
            listening_by_word["grandparent(s)"]["meanings"],
            ["祖父/母"],
        )

    def test_split_meanings_preserves_slashes_inside_a_meaning(self) -> None:
        self.assertEqual(
            split_meanings("（研究/讨论）主题/对象；科目；[语]主语"),
            ["(研究/讨论)主题/对象", "科目", "[语]主语"],
        )
        self.assertEqual(split_meanings("祖父/母"), ["祖父/母"])

    def test_rejects_plain_english_with_a_single_phonetic_slash(self) -> None:
        for value in ("english/", "/english"):
            with self.subTest(value=value):
                phonetic, tags = _clean_basic_phonetic("example", value)
                self.assertEqual(phonetic, "")
                self.assertEqual(tags, ("invalid-phonetic",))

    def test_excludes_headers_page_numbers_and_chinese_from_words(self) -> None:
        basic, listening = self.load_outputs()
        words = [str(item["word"]) for item in basic + listening]

        self.assertFalse(any(re.search(r"[\u3400-\u9fff]", word) for word in words))
        self.assertFalse(
            {"词汇", "单词", "音标", "词性", "语义", "释义", "备注"} & set(words)
        )
        self.assertFalse(any(re.fullmatch(r"\d+(?:/\d+)?", word) for word in words))
        self.assertFalse(any("雅思听力拼写词汇" in word for word in words))

    def test_repairs_slashes_without_fabricating_invalid_phonetics(self) -> None:
        basic, _ = self.load_outputs()
        invalid_words = {
            "security",
            "congratulate",
            "minibus",
            "classify",
            "flashlight",
            "secretary",
        }

        for item in basic:
            phonetic = item.get("phonetic")
            if phonetic:
                self.assertTrue(str(phonetic).startswith("/"), item)
                self.assertTrue(str(phonetic).endswith("/"), item)

        for word in invalid_words:
            matches = [
                item for item in basic if item["normalizedWord"] == word.casefold()
            ]
            self.assertTrue(matches, word)
            self.assertTrue(all("phonetic" not in item for item in matches), matches)

        invalid = [
            item for item in basic if "invalid-phonetic" in item.get("tags", [])
        ]
        suspect = [
            item for item in basic if "suspect-phonetic" in item.get("tags", [])
        ]
        repaired = [
            item for item in basic if "repaired-phonetic" in item.get("tags", [])
        ]
        self.assertEqual(len(invalid) + len(repaired), 40)
        self.assertEqual(len(invalid), 16)
        self.assertTrue(all("phonetic" not in item for item in invalid))
        self.assertEqual(len(suspect), 2)
        self.assertTrue(all(item.get("phonetic") for item in suspect))
        self.assertEqual(len(repaired), 24)

    def test_preserves_and_tags_duplicates_and_cross_book_overlap(self) -> None:
        basic, listening = self.load_outputs()

        basic_duplicate_rows = [
            item for item in basic if "duplicate-in-book" in item.get("tags", [])
        ]
        listening_duplicate_rows = [
            item for item in listening if "duplicate-in-book" in item.get("tags", [])
        ]
        basic_cross_rows = [
            item for item in basic if "cross-book-overlap" in item.get("tags", [])
        ]
        listening_cross_rows = [
            item
            for item in listening
            if "cross-book-overlap" in item.get("tags", [])
        ]

        self.assertEqual(len(basic_duplicate_rows), 2)
        self.assertEqual(
            {item["normalizedWord"] for item in basic_duplicate_rows},
            {"altitude"},
        )
        self.assertEqual(
            len({item["normalizedWord"] for item in listening_duplicate_rows}),
            31,
        )
        self.assertEqual(len(listening_duplicate_rows) - 31, 32)
        self.assertEqual(
            {item["normalizedWord"] for item in basic_cross_rows},
            {item["normalizedWord"] for item in listening_cross_rows},
        )
        self.assertEqual(
            len(
                {item["normalizedWord"] for item in basic}
                & {item["normalizedWord"] for item in listening}
            ),
            754,
        )

    def test_preserves_notes_and_allowed_empty_parts_of_speech(self) -> None:
        _, listening = self.load_outputs()
        main = [item for item in listening if item["sourceGroup"] == "main"]
        supplement = [
            item for item in listening if item["sourceGroup"] == "supplement"
        ]

        self.assertEqual(sum(bool(item.get("note")) for item in main), 94)
        self.assertEqual(sum(bool(item.get("note")) for item in supplement), 39)
        self.assertEqual(sum(not item.get("partOfSpeech") for item in listening), 43)
        by_word = {item["normalizedWord"]: item for item in listening}
        self.assertEqual(by_word["decision-making"]["partOfSpeech"], "n.")
        self.assertEqual(by_word["hall of residence"]["partOfSpeech"], "n.")

    def test_repairs_mechanical_part_of_speech_column_leakage(self) -> None:
        basic, listening = self.load_outputs()
        basic_by_word = {item["normalizedWord"]: item for item in basic}
        listening_by_word = {
            item["normalizedWord"]: item for item in listening
        }

        expected_listening = {
            "african": ("n./adj.", ["非洲人/非洲的"]),
            "alternative": ("n./adj.", ["替代品"]),
            "american": ("n./adj.", ["美国人/美国的"]),
            "asian": ("n./adj.", ["亚洲人/亚洲的"]),
            "australian": ("n./adj.", ["澳大利亚人/澳大利亚的"]),
            "back": ("n./adj.", ["后背/后面的"]),
            "chemical": ("n./adj.", ["化学药品/化学的"]),
            "deputy": ("n./adj.", ["代表/副的"]),
            "open": ("n./adj.", ["户外/开放的"]),
            "outside": ("adv./adj.", ["在户外/外部的"]),
            "underground": ("adj./adv.", ["在地下"]),
            "young": ("adj./n.", ["年轻的/年轻人"]),
            "department store": ("n.", ["百货商店"]),
            "self-employment": ("n.", ["个体经营"]),
        }
        for word, (part_of_speech, meanings) in expected_listening.items():
            with self.subTest(word=word):
                self.assertEqual(
                    listening_by_word[word]["partOfSpeech"],
                    part_of_speech,
                )
                self.assertEqual(listening_by_word[word]["meanings"], meanings)

        self.assertEqual(basic_by_word["amazing"]["partOfSpeech"], "a.")
        self.assertEqual(basic_by_word["combine"]["partOfSpeech"], "v.")

    def test_validate_entries_exposes_deterministic_book_statistics(self) -> None:
        basic, listening = self.load_outputs()
        self.assertTrue(hasattr(extraction, "validate_entries"))

        basic_stats = extraction.validate_entries(basic)
        listening_stats = extraction.validate_entries(listening)
        self.assertEqual(basic_stats["entryCount"], 1997)
        self.assertEqual(basic_stats["uniqueNormalizedWords"], 1996)
        self.assertEqual(basic_stats["duplicateKeys"], 1)
        self.assertEqual(basic_stats["duplicateExtra"], 1)
        self.assertEqual(basic_stats["emptyMeanings"], 0)
        self.assertEqual(basic_stats["tagCounts"]["repaired-phonetic"], 24)
        self.assertEqual(basic_stats["tagCounts"]["invalid-phonetic"], 16)
        self.assertEqual(basic_stats["tagCounts"]["suspect-phonetic"], 2)

        self.assertEqual(listening_stats["entryCount"], 2497)
        self.assertEqual(listening_stats["uniqueNormalizedWords"], 2465)
        self.assertEqual(listening_stats["duplicateKeys"], 31)
        self.assertEqual(listening_stats["duplicateExtra"], 32)
        self.assertEqual(listening_stats["emptyMeanings"], 0)
        self.assertEqual(listening_stats["emptyPartOfSpeech"], 43)
        self.assertEqual(listening_stats["noteCount"], 133)

    def test_extraction_report_is_complete_checked_in_and_deterministic(self) -> None:
        self.run_extraction()
        report_path = self.report_dir / "vocabulary-extraction-report.md"
        self.assertTrue(report_path.is_file())
        first = report_path.read_bytes()

        rerun = subprocess.run(
            [
                sys.executable,
                str(EXTRACT_SCRIPT),
                "--source-dir",
                str(SOURCE_DIR),
                "--output-dir",
                str(self.output_dir),
                "--report-dir",
                str(self.report_dir),
            ],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        self.assertEqual(rerun.returncode, 0, msg=rerun.stderr)
        self.assertEqual(first, report_path.read_bytes())
        self.assertEqual(
            first,
            (
                CHECKED_IN_REPORT_DIR / "vocabulary-extraction-report.md"
            ).read_bytes(),
        )
        self.assertTrue(first.endswith(b"\n"))

        report = first.decode("utf-8")
        expected_fragments = (
            "一叶留学教育_雅思·托福基础词汇.pdf",
            "bd54bc05b42ef9ae6d4bcb2b66d7ae57320ebc4b8420310626a4831075129626",
            "一叶留学教育_雅思听力拼写词汇.pdf",
            "40ed29f3b6be362f2c901c43962aee86ea6aad3c1d0cc186606baa07879a942e",
            "61",
            "49",
            "1997",
            "2497",
            "20 Day",
            "1937",
            "560",
            "754",
            "43",
            "94",
            "39",
            "repaired-phonetic",
            "invalid-phonetic",
            "suspect-phonetic",
            "POS alignment fixes (16)",
            "department store",
            "self-employment",
            "amazing",
            "combine",
            "24",
            "16",
            "2000",
            "not a missing-row defect",
            "Page 2",
            "Page 36",
            "Page 37",
            "Page 49",
            "Page 61",
            "precise",
            "freeze",
            "absence",
            "zoom lens",
        )
        for fragment in expected_fragments:
            self.assertIn(fragment, report)

    def test_validator_accepts_canonical_data_and_report_is_deterministic(self) -> None:
        self.run_extraction()
        report_path = self.report_dir / "vocabulary-validation.json"
        result = self.run_validation(self.output_dir, report_path)
        self.assertEqual(
            result.returncode,
            0,
            msg=f"validation failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}",
        )
        first = report_path.read_bytes()
        rerun = self.run_validation(self.output_dir, report_path)
        self.assertEqual(rerun.returncode, 0, msg=rerun.stderr)
        self.assertEqual(first, report_path.read_bytes())
        self.assertEqual(
            first,
            (
                CHECKED_IN_REPORT_DIR / "vocabulary-validation.json"
            ).read_bytes(),
        )
        self.assertTrue(first.endswith(b"\n"))

        report = json.loads(first)
        self.assertEqual(report["status"], "pass")
        self.assertEqual(report["blockingErrorCount"], 0)
        self.assertEqual(report["totals"]["sourceRows"], 4494)
        self.assertEqual(report["totals"]["finalEntries"], 4494)
        self.assertEqual(report["totals"]["emptyMeanings"], 0)
        self.assertEqual(report["books"][BASIC_BOOK_ID]["duplicateExtra"], 1)
        self.assertEqual(
            report["books"][LISTENING_BOOK_ID]["duplicateKeys"],
            31,
        )
        self.assertEqual(
            report["books"][LISTENING_BOOK_ID]["duplicateExtra"],
            32,
        )
        self.assertEqual(report["crossBook"]["normalizedOverlap"], 754)
        self.assertEqual(
            report["checks"]["part_of_speech_misalignment"]["remaining"],
            0,
        )
        self.assertEqual(
            report["checks"]["duplicate_within_book"]["duplicateKeyCount"],
            32,
        )
        self.assertEqual(
            report["checks"]["duplicate_within_book"]["duplicateExtraCount"],
            33,
        )
        self.assertEqual(
            report["checks"]["duplicate_within_book"]["detected"],
            report["checks"]["duplicate_within_book"]["remaining"],
        )

        case_anomaly = report["checks"]["case_anomaly"]
        self.assertEqual(case_anomaly["severity"], "warning")
        self.assertEqual(case_anomaly["detected"], 12)
        self.assertEqual(case_anomaly["fixed"], 0)
        self.assertEqual(case_anomaly["remaining"], 12)
        self.assertEqual(case_anomaly["sourceUppercaseCount"], 87)
        self.assertEqual(case_anomaly["acceptedProperOrAcronymCount"], 75)
        self.assertEqual(
            {item["word"] for item in case_anomaly["items"]},
            {
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
            },
        )

        row_boundary = report["checks"]["row_boundary_leakage"]
        self.assertEqual(row_boundary["severity"], "blocking")
        self.assertEqual(row_boundary["remaining"], 0)

        EXPECTED_CHECKS = {
            "whitespace",
            "case_anomaly",
            "unicode_normalization",
            "broken_word_or_line",
            "phonetic_misalignment",
            "part_of_speech_misalignment",
            "header_or_page_number",
            "empty_word",
            "empty_meaning",
            "duplicate_within_book",
            "duplicate_across_books",
            "note_split",
            "overlong_text",
            "suspected_garbled_text",
            "missing_source_group",
            "row_boundary_leakage",
        }
        self.assertLessEqual(EXPECTED_CHECKS, set(report["checks"]))
        expected_checks = EXPECTED_CHECKS | {
            "schema_type",
            "identity_and_order",
            "expected_counts",
            "tag_consistency",
            "known_sentinels",
            "known_source_anomalies",
        }
        self.assertEqual(set(report["checks"]), expected_checks)
        for name, check in report["checks"].items():
            with self.subTest(check=name):
                self.assertGreaterEqual(
                    set(check),
                    {"detected", "fixed", "remaining", "samples"},
                )
                self.assertIn("count", check)
                self.assertIsInstance(check["count"], int)
                self.assertGreaterEqual(check["count"], 0)
                self.assertIn(check["severity"], {"blocking", "warning", "info"})
                self.assertIsInstance(check["items"], list)
                self.assertIsInstance(check["detected"], int)
                self.assertIsInstance(check["fixed"], int)
                self.assertIsInstance(check["remaining"], int)
                self.assertGreaterEqual(check["detected"], 0)
                self.assertGreaterEqual(check["fixed"], 0)
                self.assertGreaterEqual(check["remaining"], 0)
                self.assertIsInstance(check["samples"], list)

    def test_validator_blocks_missing_day(self) -> None:
        report = self.validate_corrupted_fixture(
            "missing-day",
            lambda basic, _listening: [
                item.__setitem__("sourceGroup", "Day 19")
                for item in basic
                if item["sourceGroup"] == "Day 20"
            ],
        )
        self.assertGreater(report["checks"]["missing_source_group"]["count"], 0)

    def test_validator_blocks_empty_meaning(self) -> None:
        def empty_meaning(
            basic: list[dict[str, object]],
            _listening: list[dict[str, object]],
        ) -> None:
            basic[0]["meanings"] = []

        report = self.validate_corrupted_fixture("empty-meaning", empty_meaning)
        self.assertGreater(report["checks"]["empty_meaning"]["remaining"], 0)

    def test_validator_blocks_identity_or_order_mismatch(self) -> None:
        def corrupt_identity(
            basic: list[dict[str, object]],
            _listening: list[dict[str, object]],
        ) -> None:
            basic[0]["id"] = f"{BASIC_BOOK_ID}-9999"
            basic[0]["sourceOrder"] = 9999

        report = self.validate_corrupted_fixture("bad-identity", corrupt_identity)
        self.assertGreater(report["checks"]["identity_and_order"]["count"], 0)

    def test_validator_blocks_chinese_text_leaked_into_word(self) -> None:
        def chinese_word(
            _basic: list[dict[str, object]],
            listening: list[dict[str, object]],
        ) -> None:
            listening[0]["word"] = "词汇"
            listening[0]["normalizedWord"] = "词汇"

        report = self.validate_corrupted_fixture("chinese-word", chinese_word)
        check = report["checks"]["row_boundary_leakage"]
        self.assertEqual(check["severity"], "blocking")
        self.assertGreater(check["remaining"], 0)

    def test_validator_blocks_english_row_bleed_into_meaning(self) -> None:
        def english_bleed(
            _basic: list[dict[str, object]],
            listening: list[dict[str, object]],
        ) -> None:
            # Simulate the next source row's English word leaking into the
            # Chinese meaning cell of the previous row.
            listening[0]["meanings"] = ["ability 缺席"]

        report = self.validate_corrupted_fixture("english-bleed", english_bleed)
        check = report["checks"]["row_boundary_leakage"]
        self.assertEqual(check["severity"], "blocking")
        self.assertGreater(check["remaining"], 0)

    def test_validator_blocks_structurally_invalid_phonetic(self) -> None:
        def invalid_phonetic(
            basic: list[dict[str, object]],
            _listening: list[dict[str, object]],
        ) -> None:
            basic[0]["phonetic"] = "english/"

        report = self.validate_corrupted_fixture(
            "invalid-phonetic",
            invalid_phonetic,
        )
        self.assertGreater(report["checks"]["phonetic_misalignment"]["count"], 0)

    def test_requirements_pin_pdfplumber(self) -> None:
        requirements_path = PROJECT_ROOT / "scripts" / "requirements.txt"
        self.assertTrue(requirements_path.is_file())
        requirements = requirements_path.read_text(encoding="utf-8")
        self.assertIn("pdfplumber==0.11.9", requirements.splitlines())

    def test_checked_in_outputs_match_fresh_generation_and_are_deterministic(self) -> None:
        self.run_extraction()
        filenames = (
            f"{BASIC_BOOK_ID}.json",
            f"{LISTENING_BOOK_ID}.json",
        )
        first_hashes = {
            filename: hashlib.sha256(
                (self.output_dir / filename).read_bytes()
            ).hexdigest()
            for filename in filenames
        }

        rerun = subprocess.run(
            [
                sys.executable,
                str(EXTRACT_SCRIPT),
                "--source-dir",
                str(SOURCE_DIR),
                "--output-dir",
                str(self.output_dir),
                "--report-dir",
                str(self.report_dir),
            ],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        self.assertEqual(rerun.returncode, 0, msg=rerun.stderr)

        second_hashes = {
            filename: hashlib.sha256(
                (self.output_dir / filename).read_bytes()
            ).hexdigest()
            for filename in filenames
        }
        self.assertEqual(first_hashes, second_hashes)

        for filename in filenames:
            generated = (self.output_dir / filename).read_bytes()
            checked_in = (CHECKED_IN_DATA_DIR / filename).read_bytes()
            self.assertEqual(generated, checked_in)
            self.assertTrue(generated.endswith(b"\n"))

if __name__ == "__main__":
    unittest.main()
