"""Local tests for the educational companion, not validation of a utility model."""

import math
import unittest
from dataclasses import replace

from demo import evaluate, features, fit, grouped_split, make_records, predict, sigmoid


class SyntheticCompanionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records = make_records()
        cls.train, cls.test = grouped_split(cls.records)
        cls.weights = fit(cls.train)

    def test_generation_is_deterministic(self):
        self.assertEqual(self.records, make_records())
        self.assertNotEqual(self.records, make_records(seed=99))

    def test_split_is_deterministic_and_input_order_independent(self):
        self.assertEqual((self.train, self.test), grouped_split(list(reversed(self.records))))

    def test_groups_and_properties_do_not_leak(self):
        for attribute in ("group_id", "property_id"):
            train_ids = {getattr(row, attribute) for row in self.train}
            test_ids = {getattr(row, attribute) for row in self.test}
            self.assertFalse(train_ids & test_ids)
        self.assertEqual(len(self.train) + len(self.test), len(self.records))
        self.assertEqual(len(self.test), 200)

    def test_duplicate_property_rows_are_rejected(self):
        with self.assertRaises(ValueError):
            grouped_split(self.records + [self.records[0]])
        # Reject duplicates even when inconsistent entity resolution assigns another group.
        with self.assertRaises(ValueError):
            grouped_split(self.records + [replace(self.records[0], group_id="different-group")])

    def test_labels_and_identifiers_are_not_features(self):
        row = self.records[0]
        changed = replace(row, target=1 - row.target, property_id="another", group_id="another")
        self.assertEqual(features(row), features(changed))

    def test_weak_keyword_is_not_the_training_label(self):
        self.assertTrue(any(row.keyword_evidence != row.target for row in self.records))

    def test_missing_age_is_explicit_and_finite(self):
        values = features(replace(self.records[0], installation_age=None))
        self.assertEqual(values[-1], 1.0)
        self.assertTrue(all(math.isfinite(value) for value in values))

    def test_sigmoid_is_stable_at_extremes(self):
        self.assertEqual(sigmoid(1000), 1.0)
        self.assertEqual(sigmoid(-1000), 0.0)

    def test_fit_is_repeatable_and_uses_training_rows_only(self):
        self.assertEqual(self.weights, fit(self.train))
        # Reversing every held-out target cannot change the split or learned model.
        test_ids = {row.property_id for row in self.test}
        changed_records = [replace(row, target=1 - row.target)
                           if row.property_id in test_ids else row for row in self.records]
        changed_train, changed_test = grouped_split(changed_records)
        self.assertEqual(changed_train, self.train)
        self.assertEqual({row.property_id for row in changed_test}, test_ids)
        self.assertEqual(self.weights, fit(changed_train))

    def test_metrics_match_hand_calculation(self):
        metrics = evaluate([0, 1], [0.25, 0.75])
        self.assertAlmostEqual(metrics["brier_score"], 0.0625)
        self.assertAlmostEqual(metrics["log_loss"], -math.log(0.75))
        self.assertEqual(metrics["accuracy_at_illustrative_0_5"], 1)

    def test_intentionally_learnable_synthetic_signal(self):
        targets = [row.target for row in self.test]
        probabilities = [predict(self.weights, row) for row in self.test]
        self.assertTrue(all(0 <= p <= 1 for p in probabilities))
        learned = evaluate(targets, probabilities)
        prevalence = sum(row.target for row in self.train) / len(self.train)
        baseline = evaluate(targets, [prevalence] * len(self.test))
        self.assertLess(learned["log_loss"], baseline["log_loss"])
        self.assertLess(learned["brier_score"], baseline["brier_score"])

    def test_invalid_inputs_are_rejected(self):
        for fraction in (0, 1, -1):
            with self.assertRaises(ValueError):
                grouped_split(self.records, test_fraction=fraction)
        with self.assertRaises(ValueError):
            fit([])
        for targets, probabilities in (([], []), ([0], [0.1, 0.2]), ([2], [0.1]),
                                       ([0], [float("nan")]), ([1], [1.1])):
            with self.assertRaises(ValueError):
                evaluate(targets, probabilities)


if __name__ == "__main__":
    unittest.main()
