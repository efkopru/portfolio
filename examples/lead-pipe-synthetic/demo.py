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
    split = report["split"]
    loss_max = max(1.0, math.ceil(max(metrics[key] for metrics in (model, baseline)
                                   for key in ("brier_score", "log_loss")) * 4) / 4)
    loss_width = 300
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="866" viewBox="0 0 1200 866" role="img" aria-labelledby="title desc">',
        '<title id="title">Synthetic lead-pipe model evaluation</title>',
        '<desc id="desc">Brier and log-loss comparison against training prevalence, plus a reliability plot. '
        f'Generated from {split["test_properties"]} held-out invented records in {split["test_groups"]} disjoint groups. '
        'Not real-world performance. Both loss metrics use one common zero-based scale; '
        'the reliability plot uses equal zero-to-one axes.</desc>',
        '<rect width="1200" height="866" fill="#fff"/>',
        '<g font-family="Arial, sans-serif" fill="#253746">',
        '<text x="40" y="47" font-size="16" fill="#5f6b73">Synthetic example</text>',
        '<text x="40" y="94" font-size="32" font-weight="700">Lead-pipe model evaluation</text>',
        '<text x="40" y="125" font-size="18" fill="#5f6b73">A reproducible comparison on invented records, with a fully separate holdout.</text>',
        f'<text x="40" y="174" font-size="18">Holdout: {split["test_properties"]} properties in {split["test_groups"]} groups</text>',
        f'<text x="40" y="203" font-size="17" fill="#5f6b73">Shared groups: {split["shared_groups"]} | Data seed: {report["seed"]}</text>',
        '<line x1="40" y1="229" x2="1160" y2="229" stroke="#d9dfe3"/>',
        '<text x="60" y="280" font-size="23" font-weight="700">Held-out losses</text>',
        '<text x="60" y="309" font-size="16" fill="#5f6b73">Lower is better. Both metrics share the same scale.</text>',
        '<circle cx="68" cy="338" r="5" fill="#147d86"/>',
        '<text x="82" y="344" font-size="15">Logistic model</text>',
        '<circle cx="250" cy="338" r="5" fill="#87939b"/>',
        '<text x="264" y="344" font-size="15">Training-prevalence baseline</text>',
    ]
    for block, (key, label) in enumerate((("brier_score", "Brier score"), ("log_loss", "Log loss"))):
        y = 390 + block * 149
        parts.append(f'<text x="60" y="{y}" font-size="19" font-weight="700">{label}</text>')
        for index, (metrics, color, name) in enumerate(((model, "#147d86", "Model"), (baseline, "#87939b", "Baseline"))):
            line_y = y + 19 + index * 43
            width = metrics[key] / loss_max * loss_width
            parts.extend([
                f'<text x="60" y="{line_y + 20}" font-size="16" fill="#5f6b73">{name}</text>',
                f'<rect x="151" y="{line_y}" width="{width:.3f}" height="28" fill="{color}" '
                f'data-metric="{key}" data-predictor="{name.lower()}"><title>{label}, {name}: {metrics[key]:.4f}</title></rect>',
                f'<text x="465" y="{line_y + 20}" font-size="17" font-weight="700">{metrics[key]:.4f}</text>',
            ])
    for tick in range(5):
        x = 151 + tick * loss_width / 4
        parts.extend([
            f'<line x1="{x:g}" y1="644" x2="{x:g}" y2="651" stroke="#87939b"/>',
            f'<text x="{x:g}" y="673" text-anchor="middle" font-size="14" fill="#5f6b73">{tick * loss_max / 4:g}</text>',
        ])
    parts.extend([
        '<line x1="151" y1="644" x2="451" y2="644" stroke="#87939b"/>',
        f'<text x="60" y="711" font-size="15" fill="#5f6b73">Common loss scale: 0 to {loss_max:g}. Bar lengths are proportional.</text>',
        '<text x="630" y="280" font-size="23" font-weight="700">Reliability by probability bin</text>',
        '<text x="630" y="309" font-size="16" fill="#5f6b73">Descriptive check; no calibrator was fitted.</text>',
    ])
    plot_left, plot_bottom, plot_size = 724, 654, 326
    for tick in range(6):
        x = plot_left + tick * plot_size / 5
        y = plot_bottom - tick * plot_size / 5
        parts.extend([
            f'<line x1="724" y1="{y:g}" x2="1050" y2="{y:g}" stroke="#e5e9ec"/>',
            f'<line x1="{x:g}" y1="328" x2="{x:g}" y2="654" stroke="#e5e9ec"/>',
            f'<text x="710" y="{y + 5:g}" text-anchor="end" font-size="14" fill="#5f6b73">{tick / 5:.1f}</text>',
            f'<text x="{x:g}" y="676" text-anchor="middle" font-size="14" fill="#5f6b73">{tick / 5:.1f}</text>',
        ])
    parts.extend([
        '<path d="M724 328V654H1050" fill="none" stroke="#87939b" stroke-width="1.5"/>',
        '<line x1="724" y1="654" x2="1050" y2="328" stroke="#87939b" stroke-width="2" stroke-dasharray="7 6"/>',
    ])
    for item in report["reliability_bins"]:
        if not item["count"]:
            continue
        x = plot_left + item["mean_prediction"] * plot_size
        y = plot_bottom - item["observed_fraction"] * plot_size
        label = escape(f'{item["interval"]}: n={item["count"]}, mean prediction {item["mean_prediction"]:.4f}, observed {item["observed_fraction"]:.4f}')
        parts.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="7" fill="#147d86" stroke="#fff" stroke-width="2" data-reliability-bin="{escape(item["interval"])}"><title>{label}</title></circle>')
        parts.append(f'<text x="{x + 12:.3f}" y="{y - 12:.3f}" font-size="14" font-weight="700">n={item["count"]}</text>')
    parts.extend([
        '<text x="887" y="700" text-anchor="middle" font-size="16">Mean predicted probability</text>',
        '<text transform="translate(658 491) rotate(-90)" text-anchor="middle" font-size="16">Observed positive fraction</text>',
        '<line x1="726" y1="721" x2="752" y2="721" stroke="#87939b" stroke-width="2" stroke-dasharray="7 6"/>',
        '<text x="761" y="725" font-size="12" fill="#5f6b73">Perfect agreement</text>',
        '<circle cx="922" cy="721" r="4" fill="#147d86"/>',
        '<text x="933" y="725" font-size="12" fill="#5f6b73">Bin mean; n = records</text>',
        '<line x1="40" y1="755" x2="1160" y2="755" stroke="#d9dfe3"/>',
        '<text x="54" y="783" font-size="17" font-weight="700">Synthetic-only results, not field-validated utility performance.</text>',
        f'<text x="54" y="806" font-size="15" fill="#5f6b73">Split seed {report["settings"]["split_seed"]}. Threshold {report["settings"]["threshold"]:g} is illustrative. Test labels never fit or tune the model.</text>',
        '<text x="54" y="827" font-size="15" fill="#5f6b73">The report includes confusion counts, overlapping error slices and the largest prediction errors.</text>',
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
