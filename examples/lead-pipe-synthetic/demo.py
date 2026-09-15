"""New educational companion: synthetic data, grouped split, logistic baseline.

Not the original lead-service prototype. Not field validated or suitable for
material determinations, public-health decisions, or regulatory use.
Python 3.10+, standard library only. No files, network, or private data required.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from dataclasses import dataclass


@dataclass(frozen=True)
class Record:
    property_id: str
    group_id: str
    installation_age: float | None
    keyword_evidence: int
    conflicting_records: int
    target: int  # Simulated material label, never inferred from a keyword rule.


def sigmoid(value: float) -> float:
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1.0 + exp_value)


def make_records(seed: int = 2026, groups: int = 160, per_group: int = 5) -> list[Record]:
    """Create fictional group/property IDs and noisy observations, without geography."""
    if groups < 4 or per_group < 1:
        raise ValueError("Use at least four groups and one property per group.")
    rng = random.Random(seed)
    records = []
    for group in range(groups):
        group_id = f"synthetic-group-{group:03d}"
        cohort_age = rng.uniform(10, 110)
        unobserved_group_effect = rng.gauss(0, 0.6)
        for property_number in range(per_group):
            age = min(120, max(0, cohort_age + rng.gauss(0, 12)))
            material_probability = sigmoid(-3.5 + age / 19 + unobserved_group_effect)
            target = int(rng.random() < material_probability)
            # Evidence is a noisy observation of the simulated state, not its label.
            keyword = int(rng.random() < (0.72 if target else 0.23))
            conflict = int(rng.random() < 0.15)
            if conflict:
                keyword = int(rng.random() < 0.5)
            observed_age = None if rng.random() < 0.12 else round(age, 1)
            records.append(Record(
                f"{group_id}-property-{property_number:03d}", group_id,
                observed_age, keyword, conflict, target
            ))
    return records


def grouped_split(records: list[Record], seed: int = 4173, test_fraction: float = 0.25
                  ) -> tuple[list[Record], list[Record]]:
    """Reserve whole groups using a stable hash; no labels or features affect the split."""
    if not 0 < test_fraction < 1:
        raise ValueError("test_fraction must lie strictly between zero and one.")
    if len({row.property_id for row in records}) != len(records):
        raise ValueError("Expected exactly one prepared row per property.")
    groups = sorted({row.group_id for row in records}, key=lambda group: (
        hashlib.sha256(f"{seed}:{group}".encode("utf-8")).hexdigest(), group
    ))
    if len(groups) < 2:
        raise ValueError("At least two groups are required.")
    count = min(len(groups) - 1, max(1, round(len(groups) * test_fraction)))
    test_groups = set(groups[:count])
    train = sorted((row for row in records if row.group_id not in test_groups),
                   key=lambda row: row.property_id)
    test = sorted((row for row in records if row.group_id in test_groups),
                  key=lambda row: row.property_id)
    return train, test


def features(record: Record) -> tuple[float, ...]:
    """Fixed transforms only; property/group identifiers and targets are excluded."""
    age = record.installation_age if record.installation_age is not None else 60.0
    return (1.0, (age - 60.0) / 60.0, float(record.keyword_evidence),
            float(record.conflicting_records), float(record.installation_age is None))


def predict(weights: list[float], record: Record) -> float:
    return sigmoid(sum(weight * value for weight, value in zip(weights, features(record))))


def fit(train: list[Record], epochs: int = 900, rate: float = 0.4,
        penalty: float = 0.002) -> list[float]:
    """Full-batch L2 logistic regression; fixed settings, no test-driven tuning."""
    if not train or epochs < 1 or rate <= 0 or penalty < 0:
        raise ValueError("Training data and positive optimization settings are required.")
    weights = [0.0] * 5
    matrix = [(features(row), row.target) for row in train]
    for _ in range(epochs):
        gradient = [0.0] * len(weights)
        for values, target in matrix:
            error = sigmoid(sum(w * x for w, x in zip(weights, values))) - target
            for index, value in enumerate(values):
                gradient[index] += error * value
        weights = [weight - rate * (gradient[index] / len(train) +
                   (penalty * weight if index else 0.0))
                   for index, weight in enumerate(weights)]
    return weights


def evaluate(targets: list[int], probabilities: list[float]) -> dict:
    if not targets or len(targets) != len(probabilities):
        raise ValueError("Provide equally sized nonempty target and probability lists.")
    if any(target not in (0, 1) for target in targets):
        raise ValueError("Targets must be binary.")
    if any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities):
        raise ValueError("Probabilities must be finite and between zero and one.")
    clipped = [min(1 - 1e-12, max(1e-12, p)) for p in probabilities]
    size = len(targets)
    return {
        "n": size,
        "positive_labels": sum(targets),
        "log_loss": sum(-y * math.log(p) - (1 - y) * math.log(1 - p)
                        for y, p in zip(targets, clipped)) / size,
        "brier_score": sum((y - p) ** 2 for y, p in zip(targets, probabilities)) / size,
        "accuracy_at_illustrative_0_5": sum((p >= 0.5) == bool(y)
                                            for y, p in zip(targets, probabilities)) / size,
    }


def run(seed: int = 2026) -> dict:
    train, test = grouped_split(make_records(seed=seed))
    assert not {row.group_id for row in train} & {row.group_id for row in test}
    assert not {row.property_id for row in train} & {row.property_id for row in test}
    weights = fit(train)
    probabilities = [predict(weights, row) for row in test]
    prevalence = sum(row.target for row in train) / len(train)
    targets = [row.target for row in test]
    # Illustrative uncertainty queue, not a validated material/risk classification.
    review = sorted(zip(test, probabilities), key=lambda item: (
        abs(item[1] - 0.5), item[0].property_id
    ))[:5]
    return {
        "scope": "New synthetic educational companion; not original implementation or field validation.",
        "seed": seed,
        "split": {
            "method": "Whole synthetic groups held out by stable hash, split seed 4173",
            "train_properties": len(train), "test_properties": len(test),
            "train_groups": len({row.group_id for row in train}),
            "test_groups": len({row.group_id for row in test}),
            "shared_groups": 0, "shared_properties": 0,
        },
        "logistic_baseline": evaluate(targets, probabilities),
        "training_prevalence_baseline": evaluate(targets, [prevalence] * len(test)),
        "illustrative_uncertainty_review": [
            {"property_id": row.property_id, "synthetic_probability": round(p, 6)}
            for row, p in review
        ],
        "limitations": [
            "Entirely invented data with intentionally learnable signal, not real predictive performance.",
            "Synthetic groups are not a substitute for real spatial, temporal, or cross-utility evaluation.",
            "No OCR, entity resolution, calibrated probabilities, conformal sets, or deployment safeguards.",
            "Review ranks and the 0.5 threshold are illustrations only; no safe/unsafe material decision.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=2026, help="Synthetic-data seed (default: 2026)")
    args = parser.parse_args()
    print(json.dumps(run(args.seed), indent=2, allow_nan=False))
