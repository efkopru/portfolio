"""Checks for educational code and arithmetic, not a utility model validation."""

import json
import math
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from dataclasses import replace
from pathlib import Path

from demo import (calibration_bins, chart_svg, error_slices, evaluate, features, fit,
                  grouped_split, make_records, predict, run, sigmoid)


class SyntheticCompanionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records = make_records()
        cls.train, cls.test = grouped_split(cls.records)
        cls.weights = fit(cls.train)
        cls.report = run()

    def test_generation_is_deterministic(self):
        self.assertEqual(self.records, make_records())
        self.assertNotEqual(self.records, make_records(seed=99))

    def test_split_is_input_order_independent(self):
        self.assertEqual((self.train, self.test), grouped_split(list(reversed(self.records))))

    def test_groups_and_properties_do_not_leak(self):
        for attribute in ("group_id", "property_id"):
            self.assertFalse({getattr(row, attribute) for row in self.train} &
                             {getattr(row, attribute) for row in self.test})
        self.assertEqual(len(self.train) + len(self.test), 800)
        self.assertEqual(len(self.test), 200)
        self.assertEqual(self.report["split"]["train_groups"], 120)
        self.assertEqual(self.report["split"]["test_groups"], 40)

    def test_duplicate_property_rows_are_rejected(self):
        for duplicate in (self.records[0], replace(self.records[0], group_id="other")):
            with self.assertRaises(ValueError):
                grouped_split(self.records + [duplicate])

    def test_labels_and_identifiers_are_not_features(self):
        row = self.records[0]
        changed = replace(row, target=1 - row.target, property_id="other", group_id="other")
        self.assertEqual(features(row), features(changed))

    def test_keyword_is_noisy_evidence_not_a_label(self):
        self.assertTrue(any(row.keyword_evidence != row.target for row in self.records))

    def test_missing_age_is_explicit_and_finite(self):
        values = features(replace(self.records[0], installation_age=None))
        self.assertEqual(values[-1], 1.0)
        self.assertEqual(values[1], 0.0)
        self.assertTrue(all(math.isfinite(value) for value in values))

    def test_sigmoid_is_stable(self):
        self.assertEqual(sigmoid(1000), 1.0)
        self.assertEqual(sigmoid(-1000), 0.0)

    def test_fit_is_repeatable_and_excludes_test_targets(self):
        self.assertEqual(self.weights, fit(self.train))
        test_ids = {row.property_id for row in self.test}
        changed = [replace(row, target=1 - row.target) if row.property_id in test_ids else row
                   for row in self.records]
        changed_train, changed_test = grouped_split(changed)
        self.assertEqual(changed_train, self.train)
        self.assertEqual({row.property_id for row in changed_test}, test_ids)
        self.assertEqual(self.weights, fit(changed_train))

    def test_metrics_match_hand_calculation(self):
        metrics = evaluate([0, 1], [0.25, 0.75])
        self.assertAlmostEqual(metrics["brier_score"], 0.0625)
        self.assertAlmostEqual(metrics["log_loss"], -math.log(0.75))
        self.assertEqual(metrics["accuracy"], 1)

    def test_confusion_arithmetic_and_threshold_boundary(self):
        metrics = evaluate([0, 1, 0, 1], [0.1, 0.8, 0.5, 0.2])
        self.assertEqual(metrics["confusion"], {"true_negative": 1, "true_positive": 1,
                                                "false_negative": 1, "false_positive": 1})
        self.assertEqual(metrics["accuracy"], 0.5)

    def test_reliability_includes_one_and_handles_empty_bins(self):
        bins = calibration_bins([0, 1, 0, 1], [0, 0.2, 0.99, 1.0])
        self.assertEqual([item["count"] for item in bins], [1, 1, 0, 0, 2])
        self.assertIsNone(bins[2]["observed_fraction"])
        self.assertIsNone(bins[2]["mean_prediction"])
        self.assertAlmostEqual(bins[4]["mean_prediction"], 0.995)
        self.assertEqual(bins[4]["observed_fraction"], 0.5)

    def test_all_reliability_records_are_counted_once(self):
        bins = self.report["reliability_bins"]
        self.assertEqual(sum(item["count"] for item in bins), 200)
        self.assertAlmostEqual(sum(item["count"] * item["observed_fraction"] for item in bins),
                               self.report["logistic_model"]["positive_labels"])

    def test_baseline_is_training_prevalence_only(self):
        prevalence = sum(row.target for row in self.train) / len(self.train)
        self.assertEqual(self.report["training_prevalence"], prevalence)
        expected = evaluate([row.target for row in self.test], [prevalence] * len(self.test))
        self.assertEqual(self.report["training_prevalence_baseline"], expected)

    def test_intentionally_learnable_signal(self):
        learned = self.report["logistic_model"]
        baseline = self.report["training_prevalence_baseline"]
        self.assertLess(learned["log_loss"], baseline["log_loss"])
        self.assertLess(learned["brier_score"], baseline["brier_score"])

    def test_error_slice_partitions_and_confusion_totals(self):
        slices = self.report["error_slices"]
        for pair in (slices[:2], slices[2:]):
            self.assertEqual(sum(item["metrics"]["n"] for item in pair), 200)
            for key, value in self.report["logistic_model"]["confusion"].items():
                self.assertEqual(sum(item["metrics"]["confusion"][key] for item in pair), value)
        empty = error_slices([replace(self.test[0], installation_age=None)], [0.5])
        self.assertIsNone(empty[0]["metrics"])

    def test_report_is_deterministic_and_presentation_complete(self):
        self.assertEqual(self.report, run())
        for key in ("title", "disclosure", "metrics", "tables", "notes"):
            self.assertTrue(self.report[key])
        for table in self.report["tables"]:
            self.assertTrue(all(len(row) == len(table["headers"]) for row in table["rows"]))
        json.dumps(self.report, allow_nan=False)
        self.assertIn("not the original", self.report["disclosure"])

    def test_svg_is_valid_and_values_come_from_report(self):
        svg = chart_svg(self.report)
        root = ET.fromstring(svg)
        self.assertEqual(root.attrib["role"], "img")
        self.assertIn(f'{self.report["logistic_model"]["brier_score"]:.4f}', svg)
        self.assertIn(f'{self.report["training_prevalence_baseline"]["log_loss"]:.4f}', svg)
        self.assertIn("not field-validated", svg)
        self.assertNotIn("<script", svg)

    def test_chart_geometry_uses_common_zero_based_loss_and_probability_scales(self):
        root = ET.fromstring(chart_svg(self.report))
        bars = [node for node in root.iter() if "data-metric" in node.attrib]
        self.assertEqual(len(bars), 4)
        for bar in bars:
            metrics = self.report["logistic_model" if bar.attrib["data-predictor"] == "model"
                                  else "training_prevalence_baseline"]
            self.assertEqual(float(bar.attrib["x"]), 151)
            self.assertAlmostEqual(float(bar.attrib["width"]),
                                   metrics[bar.attrib["data-metric"]] * 300, places=3)
        points = [node for node in root.iter() if "data-reliability-bin" in node.attrib]
        nonempty_bins = [item for item in self.report["reliability_bins"] if item["count"]]
        self.assertEqual(len(points), len(nonempty_bins))
        for point, item in zip(points, nonempty_bins):
            self.assertAlmostEqual(float(point.attrib["cx"]),
                                   724 + item["mean_prediction"] * 326, places=3)
            self.assertAlmostEqual(float(point.attrib["cy"]),
                                   654 - item["observed_fraction"] * 326, places=3)

    def test_loss_chart_expands_shared_scale_without_clipping(self):
        report = json.loads(json.dumps(self.report))
        report["training_prevalence_baseline"]["log_loss"] = 1.6
        svg = chart_svg(report)
        self.assertIn("Common loss scale: 0 to 1.75", svg)
        for bar in ET.fromstring(svg).iter():
            if "data-metric" not in bar.attrib:
                continue
            metrics = report["logistic_model" if bar.attrib["data-predictor"] == "model"
                             else "training_prevalence_baseline"]
            self.assertAlmostEqual(float(bar.attrib["width"]),
                                   metrics[bar.attrib["data-metric"]] / 1.75 * 300, places=3)
            self.assertLessEqual(float(bar.attrib["width"]), 300)

    def test_published_artifacts_match_default_run(self):
        folder = Path(__file__).resolve().parent
        self.assertEqual(json.loads((folder / "report.json").read_text(encoding="utf-8")),
                         self.report)
        figure = folder.parent.parent / "assets" / "evidence" / "lead-pipe-evaluation.svg"
        self.assertEqual(figure.read_text(encoding="utf-8"), chart_svg(self.report))

    def test_cli_exports_match_actual_run(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("demo.py")),
                                     "--report", str(destination / "report.json"),
                                     "--chart", str(destination / "chart.svg")],
                                    check=True, capture_output=True, text=True)
            self.assertEqual(json.loads(result.stdout), self.report)
            self.assertEqual(json.loads((destination / "report.json").read_text()), self.report)
            self.assertEqual((destination / "chart.svg").read_text(), chart_svg(self.report))

    def test_invalid_inputs_are_rejected(self):
        for fraction in (0, 1, -1):
            with self.assertRaises(ValueError):
                grouped_split(self.records, test_fraction=fraction)
        with self.assertRaises(ValueError):
            fit([])
        with self.assertRaises(ValueError):
            fit(self.train, rate=float("nan"))
        with self.assertRaises(ValueError):
            predict([1.0], self.test[0])
        for targets, probabilities in (([], []), ([0], [0.1, 0.2]), ([2], [0.1]),
                                       ([0], [float("nan")]), ([1], [1.1])):
            with self.assertRaises(ValueError):
                evaluate(targets, probabilities)
        for invalid in (0, -1, 1.5):
            with self.assertRaises(ValueError):
                calibration_bins([0], [0.1], bins=invalid)
        with self.assertRaises(ValueError):
            evaluate([0], [0.5], threshold=float("nan"))


if __name__ == "__main__":
    unittest.main()
