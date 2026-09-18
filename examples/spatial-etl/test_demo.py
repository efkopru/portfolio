"""Runnable regression tests for the synthetic ETL reconstruction."""

from dataclasses import asdict, replace
import json
from pathlib import Path
import sqlite3
import unittest

import demo


class ETLTests(unittest.TestCase):
    def setUp(self):
        self.rows = json.loads(Path(__file__).with_name("records.json").read_text(encoding="utf-8"))
        self.valid, self.rejected = demo.validate_batch(self.rows)
        self.connection = sqlite3.connect(":memory:")
        self.addCleanup(self.connection.close)
        demo.initialize(self.connection)

    def test_fixture_validation_and_original_quarantine(self):
        self.assertEqual(len(self.valid), 4)
        self.assertEqual(len(self.rejected), 8)
        self.assertEqual(self.rejected[0]["record"], self.rows[4])
        self.assertEqual([item["row"] for item in self.rejected], list(range(5, 13)))

    def test_schema_types_and_required_fields(self):
        bad_rows = [None, 42, [], {}, {**self.rows[0], "unexpected": True}]
        for field in demo.FIELDS:
            missing = dict(self.rows[0])
            missing.pop(field)
            bad_rows.append(missing)
        for raw in bad_rows:
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                demo.validate_record(raw)

    def test_array_required(self):
        with self.assertRaisesRegex(ValueError, "JSON array"):
            demo.validate_batch({"items": self.rows})

    def test_non_object_rows_quarantined(self):
        accepted, rejected = demo.validate_batch([None, "text", 25])
        self.assertEqual(accepted, [])
        self.assertEqual(len(rejected), 3)

    def test_coordinate_boundaries_and_normalization(self):
        record = demo.validate_record({**self.rows[0], "x": 0, "y": 10000})
        self.assertEqual((record.x, record.y), (0.0, 10000.0))
        self.assertIsInstance(record.x, float)

    def test_non_numeric_nonfinite_and_out_of_range_coordinates(self):
        for axis in ("x", "y"):
            for value in (True, False, None, "100", float("nan"), float("inf"), -float("inf"), -0.1, 10000.1, 10**1000):
                with self.subTest(axis=axis, value=value), self.assertRaises(ValueError):
                    demo.validate_record({**self.rows[0], axis: value})

    def test_crs_id_condition_timestamp_revision_contracts(self):
        cases = {
            "crs": [None, "UNKNOWN", "local:demo_cartesian"],
            "id": [None, "SYN-1", "REAL-001", 1, []],
            "condition": [None, "unknown", []],
            "inspected_at": [None, "2026-02-30T10:00:00Z", "2026-01-01", "2026-01-01T09:00:00+00:00", "2026-01-01T25:00:00Z"],
            "revision": [True, False, 1.0, "1", 0, -1, 2**63],
        }
        for field, values in cases.items():
            for value in values:
                with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                    demo.validate_record({**self.rows[0], field: value})

    def test_duplicate_policy_is_order_independent(self):
        original = self.rows[0]
        other = {**original, "x": 9000}
        for rows in ([original, other], [other, original]):
            valid, rejected = demo.validate_batch(rows)
            self.assertEqual(valid, [])
            self.assertEqual(len(rejected), 2)
            self.assertTrue(all("duplicate id" in item["reason"] for item in rejected))

    def test_idempotent_replay_has_no_writes(self):
        initial = demo.load(self.connection, self.valid)
        self.assertEqual(initial, {"inserted": 4, "updated": 0, "unchanged": 0, "stale": 0})
        before = demo.snapshot(self.connection)
        writes = self.connection.total_changes
        replay = demo.load(self.connection, self.valid)
        self.assertEqual(replay["unchanged"], 4)
        self.assertEqual(demo.snapshot(self.connection), before)
        self.assertEqual(self.connection.total_changes, writes)

    def test_updates_and_stale_revisions(self):
        demo.load(self.connection, self.valid)
        updated = replace(self.valid[0], revision=2, x=1100, inspected_at="2026-01-02T09:00:00Z")
        counts = demo.load(self.connection, [updated])
        self.assertEqual(counts["updated"], 1)
        before = demo.snapshot(self.connection)
        writes = self.connection.total_changes
        stale = demo.load(self.connection, [self.valid[0]])
        self.assertEqual(stale["stale"], 1)
        self.assertEqual(demo.snapshot(self.connection), before)
        self.assertEqual(self.connection.total_changes, writes)

    def test_injected_failure_rolls_back_updates_and_inserts_then_recovers(self):
        demo.load(self.connection, self.valid)
        before = demo.snapshot(self.connection)
        updates = [replace(self.valid[0], revision=2, condition="attention"), replace(self.valid[1], id="SYN-099")]
        with self.assertRaises(demo.InjectedFailure):
            demo.load(self.connection, updates, fail_after=2)
        self.assertEqual(demo.snapshot(self.connection), before)
        self.assertFalse(self.connection.in_transaction)
        result = demo.load(self.connection, updates)
        self.assertEqual((result["inserted"], result["updated"]), (1, 1))
        self.assertEqual(len(demo.snapshot(self.connection)), 5)

    def test_revision_conflict_rolls_back_entire_batch(self):
        demo.load(self.connection, self.valid)
        before = demo.snapshot(self.connection)
        new = replace(self.valid[1], id="SYN-099")
        conflicting = replace(self.valid[0], x=2000)
        with self.assertRaisesRegex(demo.RecordConflict, "unchanged revision"):
            demo.load(self.connection, [new, conflicting])
        self.assertEqual(demo.snapshot(self.connection), before)

    def test_backwards_inspection_time_rolls_back(self):
        demo.load(self.connection, self.valid)
        before = demo.snapshot(self.connection)
        older_time = replace(self.valid[0], revision=2, inspected_at="2025-12-31T09:00:00Z")
        with self.assertRaisesRegex(demo.RecordConflict, "older inspection time"):
            demo.load(self.connection, [older_time])
        self.assertEqual(demo.snapshot(self.connection), before)

    def test_loader_revalidates_callers_and_duplicate_ids(self):
        for records in ([replace(self.valid[0], x=-1)], [self.valid[0], self.valid[0]]):
            with self.assertRaisesRegex(ValueError, "validated"):
                demo.load(self.connection, records)
        self.assertEqual(demo.snapshot(self.connection), [])

    def test_invalid_fail_after_and_active_transaction_protected(self):
        for value in (0, -1, 5, True, 1.1):
            with self.subTest(value=value), self.assertRaises(ValueError):
                demo.load(self.connection, self.valid, fail_after=value)
        self.connection.execute("BEGIN")
        with self.assertRaisesRegex(ValueError, "active transaction"):
            demo.load(self.connection, self.valid)
        self.assertTrue(self.connection.in_transaction)
        self.connection.rollback()

    def test_structured_logging(self):
        with self.assertLogs("spatial_etl", level="INFO") as logged:
            demo.load(self.connection, self.valid)
            with self.assertRaises(demo.InjectedFailure):
                demo.load(self.connection, self.valid, fail_after=1)
        events = [json.loads(record.getMessage()) for record in logged.records]
        self.assertTrue(any(item["event"] == "load_committed" and item["inserted"] == 4 for item in events))
        self.assertTrue(any(item["event"] == "load_rolled_back" for item in events))

    def test_empty_batch_is_noop(self):
        self.assertEqual(demo.load(self.connection, []), {"inserted": 0, "updated": 0, "unchanged": 0, "stale": 0})
        self.assertEqual(demo.snapshot(self.connection), [])

    def test_report_matches_checked_in_actual_run(self):
        actual = demo.run_demo()
        expected = json.loads(Path(__file__).with_name("report.json").read_text(encoding="utf-8"))
        self.assertEqual(actual, expected)
        self.assertEqual(actual, demo.run_demo())
        self.assertTrue(all(actual["checks"].values()))
        self.assertEqual(len(actual["quarantine"]), 8)
        self.assertEqual(len(actual["tables"][2]["rows"]), 5)
        for metric in actual["metrics"]:
            self.assertIsInstance(metric["label"], str)
            self.assertIsInstance(metric["value"], str)
        for table in actual["tables"]:
            for row in table["rows"]:
                self.assertEqual(len(row), len(table["headers"]))
                self.assertTrue(all(isinstance(value, (str, int, float)) for value in row))


if __name__ == "__main__":
    unittest.main()
