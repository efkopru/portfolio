# Lead pipe prediction: synthetic educational companion

This is a **newly authored educational companion** to the portfolio case study.
It is not recovered employer source, the original prototype implementation, a
field-validated utility model, or evidence of historical savings. All records,
property identifiers, group identifiers, observations, and targets are invented.
There are no actual addresses, geographic coordinates, documents, or customers.

The example is intentionally small enough to inspect in one file. It demonstrates
how to keep groups out of both sides of a train/test split, distinguish noisy
record evidence from target labels, fit a logistic baseline, and inspect held-out
metrics. It does not reproduce the full TF-IDF, gradient-boosting, calibration, or
review-system implementation described in the separate case study.

## Run locally

Requires Python 3.10 or newer. Only the Python standard library is used. No
package installation, network calls, credentials, external dataset, or generated
files are required. Place `demo.py` and `test_demo.py` together in one folder.

From that folder on Windows:

```powershell
py -3 demo.py
py -3 -m unittest -v test_demo.py
```

If your Python executable is named `python` or `python3`, substitute that command.
The demo prints its split audit, held-out metrics, comparison baseline, five
illustrative review candidates, and limitations as JSON. Tests print their results
to the terminal. Python may create its normal local `__pycache__` directory.

An alternative synthetic dataset can be generated with `--seed 123`. Do not use
repeated seed selection to choose flattering metrics; each seed still represents
an invented data-generating process, not a new field-validation cohort.

## Data and evaluation design

1. Generate 160 fictional groups containing five unique properties each. Each
   property has exactly one prepared row. A latent age-related process generates
   the simulated binary material target. Keyword observations are deliberately
   noisy, and some age observations are missing. Neither a keyword nor a missing
   value becomes a verified label.
2. Sort groups using SHA-256 of the group identifier and a fixed split seed.
   Reserve 40 whole groups (200 properties) for testing. The other 120 groups
   (600 properties) are used for training. The split does not inspect targets or
   predictors and is independent of input row order. Duplicate property IDs are
   rejected, including IDs assigned inconsistently to different groups.
3. Build fixed features from observed age, keyword evidence, conflicting-record
   status, and an explicit missing-age indicator. The age transform uses a fixed
   scale and a fixed neutral fill value, so no test-derived preprocessing is fit.
   Group IDs, property IDs, and targets are excluded from predictors.
4. Fit L2-regularized logistic regression with batch gradient descent. Epochs,
   learning rate, and penalty are fixed in the source. No test-set tuning is done.
5. Evaluate test log loss and Brier score against the constant **training-set**
   prevalence baseline. Lower is better for both metrics. Accuracy at 0.5 is
   included only as an illustrative threshold statistic, not an operational
   decision rule. Log loss clips extreme probabilities for numerical stability.
6. Show the five held-out records closest to probability 0.5 as an illustrative
   uncertainty-review list. These are not confirmed material classifications or a
   validated risk, inspection, or active-learning queue.

## What the tests establish

The tests check deterministic generation and splitting, group/property separation,
duplicate rejection, missing-value handling, feature/label separation, stable
probabilities, metric arithmetic, repeated training, and learning the deliberately
planted synthetic signal. They do not establish real-world model accuracy.

## Important limits

- Synthetic groups do not prove robustness across real neighborhoods, time periods,
  utilities, or demographic groups. Real evaluation needs verified labels,
  entity/snapshot controls, and representative held-out populations.
- A logistic output is not automatically a calibrated probability. This example
  does not implement separate calibration groups, confidence intervals, conformal
  prediction, OCR, entity resolution, temporal snapshots, or fairness analysis.
- No thresholds have been validated for material or public-health decisions.
  Human review here is only a demonstration, not a safety assurance.
- The original professional OCR effort and its reported outcomes are separate.
  This companion did not identify real properties or produce cost savings.
- No private source or data is supplied, and no external service receives data.
