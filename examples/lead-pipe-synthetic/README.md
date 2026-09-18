# Lead pipe prediction: synthetic evaluation companion

This is a **newly authored educational companion**, not recovered employer code,
the original TF-IDF/gradient-boosting prototype, a field-validated utility model,
or evidence of historical savings. All 800 property records, group identifiers,
observations and targets are invented. There are no real addresses, coordinates,
documents or customers. No private data or external services are used.

## Run and reproduce

Python 3.10+ and the standard library are sufficient. No installation or network
access is needed. From the repository root:

```powershell
py -3 examples/lead-pipe-synthetic/demo.py --report examples/lead-pipe-synthetic/report.json --chart assets/evidence/lead-pipe-evaluation.svg
py -3 -m unittest discover -s examples/lead-pipe-synthetic -p "test_*.py" -v
```

Substitute `python` or `python3` if that is your Python executable. From the example
folder, `py -3 demo.py` prints the same JSON without creating report or chart files.
Export paths are optional and explicitly named files are overwritten. Python may
create `__pycache__`. The default data seed is **2026**, split seed **4173**.
`report.json` and `../../assets/evidence/lead-pipe-evaluation.svg` are generated
from that actual default run, not hand-entered score estimates. Tests check export
parity, arithmetic, reproducibility and leakage controls.

`--seed 123` generates another invented dataset. Do not search seeds for favorable
results: a new seed is not an independent real-world validation cohort.

## Data and model card

| Component | Fixed design |
| --- | --- |
| Population | 160 fictional groups, five unique properties per group |
| Target | Binary simulated material state from an age-related latent process |
| Evidence | Noisy keyword observation; conflicts randomize some keyword values |
| Missingness | Approximately 12% of age observations are intentionally absent |
| Predictors | Intercept, centered/scaled age, keyword flag, conflict flag, missing-age flag |
| Excluded | Property ID, group ID, target, and any test-derived transformations |
| Model | L2-regularized logistic regression, five weights including intercept |
| Optimizer | 900 full-batch gradient-descent epochs, rate 0.4, penalty 0.002 |
| Regularization | Non-intercept weights only |
| Missing-age fill | Fixed 60 years, with a separate missing indicator |
| Comparator | Constant positive-label prevalence calculated on training data only |
| Threshold | 0.5, predetermined and illustrative, not selected from test results |

Keyword evidence is generated as a noisy observation of the simulated state. This
deliberately learnable relationship tests code behavior; it says nothing about
real OCR accuracy or predictive value. A keyword is not a verified label.

## Evaluation protocol

1. Hash each whole group ID with SHA-256 and split seed 4173. Hold out 40 complete
   groups (200 properties); use 120 groups (600 properties) for training. The
   partition is independent of row order, predictors and target labels.
2. Reject duplicate property IDs, including inconsistent duplicates across groups.
   Audit that no group or property appears in both partitions.
3. Apply fixed feature transforms. Fit only on training rows. No test-driven
   scaling, feature selection, tuning, threshold selection or calibration occurs.
4. Compare Brier score, clipped log loss and accuracy against training prevalence
   on the same held-out records. Brier score and log loss are better when lower.
5. Report confusion counts at 0.5 and five equal-width reliability bins. Each bin
   reports its count, mean prediction and observed positive fraction. The final
   bin includes probability 1; empty bins have null statistics, not invented zeros.
6. Inspect missing-age and conflicting-record slices, plus the five largest
   absolute probability errors. Age and conflict slices overlap; these are
   descriptive checks, not protected-class fairness or inferential claims.

The separate five-record uncertainty list contains predictions nearest 0.5. It is
not the error list, a confirmed classification, an optimized inspection plan, or a
validated active-learning queue.

## Reading the artifacts

- `report.json`: complete settings, split audit, learned weights, raw metrics,
  confusion counts, reliability bins, slices, errors, and presentation-ready tables.
- `lead-pipe-evaluation.svg`: loss comparison and reliability plot generated from
  the report's full-precision values. The diagonal is a reference, not a fitted
  calibration curve. A text description is embedded for accessibility.
- `test_demo.py`: deterministic generation/split, group and property isolation,
  target independence, metric arithmetic, threshold and bin boundaries, baseline
  origin, error accounting, SVG validity, and real CLI-export parity.

## Limitations and intended use

This demonstrates inspectable evaluation code, not field performance. Synthetic
groups are not evidence of transfer across real neighborhoods, time periods,
utilities or demographic groups. There are no confidence intervals, calibration
fit, fairness analysis, OCR, entity resolution, conformal prediction or production
safeguards. Small slices can be unstable. A logistic output is not automatically
calibrated. Real use would require independently verified labels, representative
spatial/temporal/cross-utility evaluation and domain-authorized decision rules.

No result here supports a safe/unsafe material designation, regulatory decision,
public-health action, or historical savings claim. The original professional
prototype and its outcomes remain separate from this educational implementation.
