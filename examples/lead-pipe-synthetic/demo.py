"""Synthetic lead-pipe evaluation companion, Python 3.10+, standard library only.

Newly authored educational code, not the original utility implementation or
field performance. Never use its outputs for material or public-health decisions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from dataclasses import dataclass
from html import escape
from pathlib import Path

DATA_SEED = 2026
SPLIT_SEED = 4173
THRESHOLD = 0.5
EPOCHS = 900
RATE = 0.4
PENALTY = 0.002
DISCLOSURE = (
    "Entirely synthetic educational companion, not the original TF-IDF/gradient-boosting "
    "prototype, field validation, verified material classifications, or evidence of savings."
)


@dataclass(frozen=True)
class Record:
    property_id: str
    group_id: str
    installation_age: float | None
    keyword_evidence: int
    conflicting_records: int
    target: int


def sigmoid(value: float) -> float:
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1.0 + exp_value)


def make_records(seed: int = DATA_SEED, groups: int = 160, per_group: int = 5) -> list[Record]:
    """Invent records with noisy evidence and an intentionally learnable signal."""
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
            # Simulated evidence observes the state noisily; it is not a label rule.
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


def grouped_split(records: list[Record], seed: int = SPLIT_SEED,
                  test_fraction: float = 0.25) -> tuple[list[Record], list[Record]]:
    """Whole groups held out by stable hash, without inspecting predictors or labels."""
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
    held_out = set(groups[:count])
    train = sorted((row for row in records if row.group_id not in held_out),
                   key=lambda row: row.property_id)
    test = sorted((row for row in records if row.group_id in held_out),
                  key=lambda row: row.property_id)
    return train, test


def features(record: Record) -> tuple[float, ...]:
    """Fixed transforms; no test-fitted scaling, identifiers, or target features."""
    age = record.installation_age if record.installation_age is not None else 60.0
    return (1.0, (age - 60.0) / 60.0, float(record.keyword_evidence),
            float(record.conflicting_records), float(record.installation_age is None))


def predict(weights: list[float], record: Record) -> float:
    if len(weights) != len(features(record)):
        raise ValueError("Expected one weight per feature.")
    return sigmoid(sum(weight * value for weight, value in zip(weights, features(record))))


def fit(train: list[Record], epochs: int = EPOCHS, rate: float = RATE,
        penalty: float = PENALTY) -> list[float]:
    """Full-batch L2 logistic regression; no test-driven tuning or calibration."""
    if not train or epochs < 1 or rate <= 0 or penalty < 0:
        raise ValueError("Training data and positive optimization settings are required.")
    if not math.isfinite(rate) or not math.isfinite(penalty):
        raise ValueError("Optimization settings must be finite.")
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


def validate_predictions(targets: list[int], probabilities: list[float]) -> None:
    if not targets or len(targets) != len(probabilities):
        raise ValueError("Provide equally sized nonempty target and probability lists.")
    if any(target not in (0, 1) for target in targets):
        raise ValueError("Targets must be binary.")
    if any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities):
        raise ValueError("Probabilities must be finite and between zero and one.")


def evaluate(targets: list[int], probabilities: list[float], threshold: float = THRESHOLD) -> dict:
    validate_predictions(targets, probabilities)
    if not math.isfinite(threshold) or not 0 <= threshold <= 1:
        raise ValueError("Threshold must lie between zero and one.")
    clipped = [min(1 - 1e-12, max(1e-12, p)) for p in probabilities]
    confusion = {"true_negative": 0, "false_positive": 0,
                 "false_negative": 0, "true_positive": 0}
    names = {(0, False): "true_negative", (0, True): "false_positive",
             (1, False): "false_negative", (1, True): "true_positive"}
    for target, probability in zip(targets, probabilities):
        confusion[names[target, probability >= threshold]] += 1
    size = len(targets)
    return {
        "n": size, "positive_labels": sum(targets), "threshold": threshold,
        "log_loss": sum(-y * math.log(p) - (1 - y) * math.log(1 - p)
                        for y, p in zip(targets, clipped)) / size,
        "brier_score": sum((y - p) ** 2 for y, p in zip(targets, probabilities)) / size,
        "accuracy": (confusion["true_positive"] + confusion["true_negative"]) / size,
        "confusion": confusion,
    }


def calibration_bins(targets: list[int], probabilities: list[float], bins: int = 5) -> list[dict]:
    """Descriptive equal-width reliability bins, not fitted probability calibration."""
    validate_predictions(targets, probabilities)
    if not isinstance(bins, int) or bins < 1:
        raise ValueError("Use a positive integer number of bins.")
    grouped = [[] for _ in range(bins)]
    for target, probability in zip(targets, probabilities):
        grouped[min(bins - 1, int(probability * bins))].append((target, probability))
    return [{
        "interval": f"[{i / bins:.1f}, {(i + 1) / bins:.1f}{']' if i == bins - 1 else ')'}",
        "count": len(items),
        "mean_prediction": sum(p for _, p in items) / len(items) if items else None,
        "observed_fraction": sum(y for y, _ in items) / len(items) if items else None,
    } for i, items in enumerate(grouped)]


def error_slices(records: list[Record], probabilities: list[float]) -> list[dict]:
    validate_predictions([row.target for row in records], probabilities)
    predicates = [
        ("Age present", lambda row: row.installation_age is not None),
        ("Age missing", lambda row: row.installation_age is None),
        ("No conflicting record", lambda row: row.conflicting_records == 0),
        ("Conflicting record", lambda row: row.conflicting_records == 1),
    ]
    results = []
    for name, predicate in predicates:
        selected = [(row.target, p) for row, p in zip(records, probabilities) if predicate(row)]
        metrics = evaluate([y for y, _ in selected], [p for _, p in selected]) if selected else None
        results.append({"slice": name, "metrics": metrics})
    return results


def fmt(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.4f}"


def run(seed: int = DATA_SEED) -> dict:
    train, test = grouped_split(make_records(seed=seed))
    shared_groups = {row.group_id for row in train} & {row.group_id for row in test}
    shared_properties = {row.property_id for row in train} & {row.property_id for row in test}
    assert not shared_groups and not shared_properties
    weights = fit(train)
    probabilities = [predict(weights, row) for row in test]
    prevalence = sum(row.target for row in train) / len(train)
    targets = [row.target for row in test]
    model = evaluate(targets, probabilities)
    baseline = evaluate(targets, [prevalence] * len(test))
    reliability = calibration_bins(targets, probabilities)
    slices = error_slices(test, probabilities)
    errors = sorted(((row, p) for row, p in zip(test, probabilities)
                     if (p >= THRESHOLD) != bool(row.target)), key=lambda item: (
                         -abs(item[1] - item[0].target), item[0].property_id
                     ))[:5]
    review = sorted(zip(test, probabilities), key=lambda item: (
        abs(item[1] - THRESHOLD), item[0].property_id
    ))[:5]
    notes = [
        "All 800 records, group IDs, evidence and target labels are invented; signal is intentionally learnable.",
        "Fixed seeds: data " + str(seed) + ", split 4173. Whole-group 75/25 split; no shared groups or properties.",
        "Features and training settings were fixed before evaluation. No tuning, threshold choice or calibration uses test labels.",
        "Reliability bins describe this one synthetic holdout; they do not establish calibrated probabilities.",
        "The 0.5 threshold is illustrative, not an approved material classification or inspection rule.",
        "Age and record-conflict slices overlap; small slices have unstable estimates. No confidence intervals are claimed.",
        "Real evaluation needs verified labels and spatial, temporal and cross-utility holdouts; this example has none.",
        "This companion is separate from the original professional OCR effort and any historical cost savings.",
    ]
    tables = [
        {"heading": "Held-out model comparison (lower loss is better)",
         "headers": ["Predictor", "Brier score", "Log loss", "Accuracy at 0.5"],
         "rows": [["Logistic model", fmt(model["brier_score"]), fmt(model["log_loss"]), fmt(model["accuracy"])],
                  ["Training-prevalence baseline", fmt(baseline["brier_score"]), fmt(baseline["log_loss"]), fmt(baseline["accuracy"])]]},
        {"heading": "Confusion counts at illustrative threshold 0.5",
         "headers": ["Predictor", "True negative", "False positive", "False negative", "True positive"],
         "rows": [[name, *[metrics["confusion"][key] for key in (
             "true_negative", "false_positive", "false_negative", "true_positive")]]
                  for name, metrics in (("Logistic model", model), ("Prevalence baseline", baseline))]},
        {"heading": "Reliability bins (descriptive, not fitted calibration)",
         "headers": ["Probability interval", "Records", "Mean prediction", "Observed positive fraction"],
         "rows": [[item["interval"], item["count"], fmt(item["mean_prediction"]),
                   fmt(item["observed_fraction"])] for item in reliability]},
        {"heading": "Error slices (overlapping, descriptive)",
         "headers": ["Slice", "Records", "Brier score", "False positive", "False negative"],
         "rows": [[item["slice"], item["metrics"]["n"] if item["metrics"] else 0,
                   fmt(item["metrics"]["brier_score"]) if item["metrics"] else "n/a",
                   item["metrics"]["confusion"]["false_positive"] if item["metrics"] else "n/a",
                   item["metrics"]["confusion"]["false_negative"] if item["metrics"] else "n/a"] for item in slices]},
        {"heading": "Five largest probability errors (invented held-out properties)",
         "headers": ["Synthetic property", "Simulated target", "Prediction", "Age missing", "Record conflict"],
         "rows": [[row.property_id, row.target, fmt(p), "Yes" if row.installation_age is None else "No",
                   "Yes" if row.conflicting_records else "No"] for row, p in errors]},
    ]
    return {
        "title": "Lead pipe prediction: synthetic evaluation",
        "disclosure": DISCLOSURE,
        "metrics": [{"label": "Held-out properties", "value": len(test)},
                    {"label": "Held-out groups", "value": len({row.group_id for row in test})},
                    {"label": "Shared groups", "value": len(shared_groups)},
                    {"label": "Model Brier score", "value": fmt(model["brier_score"])}],
        "tables": tables, "notes": notes, "seed": seed,
        "settings": {"split_seed": SPLIT_SEED, "test_fraction": 0.25, "threshold": THRESHOLD,
                     "epochs": EPOCHS, "learning_rate": RATE, "l2_penalty": PENALTY,
                     "calibration_bins": 5, "optimizer": "Full-batch gradient descent"},
        "split": {"train_properties": len(train), "test_properties": len(test),
                  "train_groups": len({row.group_id for row in train}),
                  "test_groups": len({row.group_id for row in test}),
                  "shared_groups": len(shared_groups), "shared_properties": len(shared_properties)},
        "learned_weights": weights, "training_prevalence": prevalence,
        "logistic_model": model, "training_prevalence_baseline": baseline,
        "reliability_bins": reliability, "error_slices": slices,
        "illustrative_uncertainty_review": [
            {"property_id": row.property_id, "synthetic_probability": p} for row, p in review
        ],
    }


def chart_svg(report: dict) -> str:
    """Produce a self-contained, accessible vector chart from the run's raw metrics."""
    model = report["logistic_model"]
    baseline = report["training_prevalence_baseline"]
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="730" viewBox="0 0 1100 730" role="img" aria-labelledby="title desc">',
        '<title id="title">Synthetic lead-pipe model evaluation</title>',
        '<desc id="desc">Brier and log-loss comparison against training prevalence, plus a reliability plot. '
        'Generated from 200 held-out invented records in 40 disjoint groups. Not real-world performance.</desc>',
        '<rect width="1100" height="730" rx="18" fill="#edf6fa"/>',
        '<g font-family="Arial, sans-serif" fill="#163447">',
        '<text x="44" y="49" font-size="16" font-weight="700">REPRODUCIBLE EDUCATIONAL EXAMPLE</text>',
        '<text x="44" y="94" font-size="30" font-weight="700">Inspect the errors, not just the score</text>',
        f'<text x="44" y="127" font-size="17">Synthetic data seed {report["seed"]} | 200 held-out properties | 40 groups | no shared groups</text>',
        '<rect x="34" y="160" width="1032" height="446" rx="12" fill="#fff"/>',
        '<text x="58" y="198" font-size="20" font-weight="700">Held-out losses</text>',
        '<text x="58" y="224" font-size="15">Lower is better; bars share a 0 to 1 scale.</text>',
    ]
    for block, (key, label) in enumerate((("brier_score", "Brier score"), ("log_loss", "Log loss"))):
        y = 268 + block * 126
        parts.append(f'<text x="58" y="{y}" font-size="17" font-weight="700">{label}</text>')
        for index, (metrics, color, name) in enumerate(((model, "#176285", "Logistic"), (baseline, "#a34422", "Prevalence"))):
            line_y = y + 16 + index * 39
            parts.append(f'<text x="58" y="{line_y + 17}" font-size="15">{name}</text>')
            parts.append(f'<rect x="151" y="{line_y}" width="{metrics[key] * 330:.3f}" height="25" rx="4" fill="{color}"/>')
            parts.append(f'<text x="{158 + metrics[key] * 330:.3f}" y="{line_y + 18}" font-size="15">{metrics[key]:.4f}</text>')
    parts.extend([
        '<text x="603" y="198" font-size="20" font-weight="700">Reliability by probability bin</text>',
        '<text x="603" y="224" font-size="15">Descriptive check; no calibrator was fitted.</text>',
    ])
    for tick in range(6):
        x = 660 + tick * 61
        y = 525 - tick * 53
        parts.extend([
            f'<line x1="660" y1="{y}" x2="965" y2="{y}" stroke="#d5e2e9"/>',
            f'<text x="644" y="{y + 5}" text-anchor="end" font-size="13">{tick / 5:.1f}</text>',
            f'<text x="{x}" y="548" text-anchor="middle" font-size="13">{tick / 5:.1f}</text>',
        ])
    parts.append('<line x1="660" y1="525" x2="965" y2="260" stroke="#667785" stroke-width="2" stroke-dasharray="6 5"/>')
    for item in report["reliability_bins"]:
        if not item["count"]:
            continue
        x = 660 + item["mean_prediction"] * 305
        y = 525 - item["observed_fraction"] * 265
        label = escape(f'{item["interval"]}: n={item["count"]}, mean prediction {item["mean_prediction"]:.4f}, observed {item["observed_fraction"]:.4f}')
        parts.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="7" fill="#176285" stroke="#fff" stroke-width="2"><title>{label}</title></circle>')
        parts.append(f'<text x="{x + 10:.3f}" y="{y - 10:.3f}" font-size="12">n={item["count"]}</text>')
    parts.extend([
        '<text x="812" y="577" text-anchor="middle" font-size="15">Mean predicted probability</text>',
        '<text transform="translate(605 399) rotate(-90)" text-anchor="middle" font-size="15">Observed positive fraction</text>',
        '<text x="44" y="642" font-size="17" font-weight="700">Synthetic-only results, not field-validated utility performance.</text>',
        '<text x="44" y="671" font-size="15">Fixed split seed 4173. Threshold 0.5 is illustrative. Test labels never fit or tune the model.</text>',
        '<text x="44" y="698" font-size="15">See the report for confusion counts, overlapping error slices and the largest prediction errors.</text>',
        '</g></svg>',
    ])
    return "\n".join(parts) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=DATA_SEED, help="Synthetic-data seed (default: 2026)")
    parser.add_argument("--report", type=Path, help="Optional output JSON path; overwrites that file")
    parser.add_argument("--chart", type=Path, help="Optional output SVG path; overwrites that file")
    args = parser.parse_args()
    report = run(args.seed)
    serialized = json.dumps(report, indent=2, allow_nan=False) + "\n"
    for path, content in ((args.report, serialized), (args.chart, chart_svg(report))):
        if path:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
    print(serialized, end="")


if __name__ == "__main__":
    main()
