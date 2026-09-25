# Synthetic spatial ETL

A small, independently authored teaching example of geospatial ingestion patterns. Every record, identifier, coordinate and inspection date is invented. This is not employer code, the original utility inspection pipeline, a deployed architecture, a production benchmark or a claim about historical project results.

Guide reviewed against the included source and tests on 25 September 2026.

## Run

Requires Python 3.10 or later with its standard-library `sqlite3` module. No third-party packages, credentials, network services or dataset setup are needed. Run from the repository root. On Windows:

```powershell
py -3 examples/spatial-etl/demo.py
```

The command prints the full JSON report to stdout and structured event logs to stderr. SQLite runs in memory, so each invocation starts fresh and leaves no database behind. To regenerate the checked-in report and run the tests:

```powershell
py -3 examples/spatial-etl/demo.py --report examples/spatial-etl/report.json
py -3 -m unittest discover -s examples/spatial-etl -p "test_*.py" -v
```

On installations where the interpreter is named `python` or `python3`, substitute that executable for `py -3`. The checked-in `report.json` is produced by this command, not manually specified. Tests assert that its content exactly matches a fresh execution. `--report` overwrites the explicitly named file; omitting it leaves the report file unchanged. Python may create `__pycache__` when tests import the module.

## Architecture

```text
Invented JSON records
         |
Schema, CRS, extent, timestamp, revision and duplicate-ID validation
         |                                 |
Accepted records                    Quarantine with reason + original row
         |
SQLite BEGIN IMMEDIATE: parameterized insert / revision-aware update
         |                                 |
Commit                         Injected failure -> rollback -> snapshot check
         |                                                   |
Replay / stale revision checks                    Retry same batch -> commit
         |                                                   |
         +---------------- JSON evidence report -------------+
```

The accompanying [architecture diagram](../../assets/evidence/spatial-etl.svg) is an educational reconstruction, not an employer architecture.

## Spatial and schema contract

`LOCAL:DEMO_CARTESIAN` is a made-up local coordinate reference system: arbitrary origin, x right/east, y up/north, metres, inclusive extent 0 to 10,000 on both axes. It is intentionally **not georeferenced**. Do not treat these coordinates as latitude/longitude, attach an EPSG code, overlay them on an Earth map, or infer real infrastructure locations. This example validates a declared CRS and bounds; it does not reproject data or validate geometry topology.

Each JSON object must have exactly these fields:

| Field | Requirement |
| --- | --- |
| `id` | String matching `SYN-NNN`; duplicate IDs quarantine every occurrence in the batch |
| `crs` | Exactly `LOCAL:DEMO_CARTESIAN` |
| `x`, `y` | Finite numeric metre values in [0, 10000]; booleans and numeric strings rejected |
| `condition` | `clear` or `attention` |
| `inspected_at` | Valid UTC timestamp in `YYYY-MM-DDTHH:MM:SSZ` format |
| `revision` | Integer from 1 through 2^63 - 1; booleans rejected |

Missing and unexpected fields are rejected. Quarantine preserves the source row and human-readable reason in the report. Twelve supplied rows exercise valid data and eight rejected rows, including both occurrences of a duplicate ID.

## Update, failure and recovery policy

The synthetic ID is the primary key. A new ID is inserted. A higher revision replaces the row only when its inspection time is not older. An identical revision and payload is a no-op. An older revision is skipped. Different values for the same revision are a conflict: the complete batch rolls back, rather than silently selecting a winner. Input to the loader is revalidated even if callers construct `Record` objects themselves.

The demo loads four accepted rows, replays them, and prepares two updates plus one insertion. It deliberately fails after the second update and compares the entire database snapshot against the pre-load snapshot. It then retries, verifies recovery, repeats the recovered batch, and replays older source revisions. The five final records and all intermediate committed counts are inspectable in the generated report. All database values use bound SQL parameters.

## What the tests cover

- Deterministic report generation and parity with the checked-in report.
- Strict schema, CRS, coordinate, date and revision validation, including NaN and infinity.
- Rejection of both duplicate occurrences and retention of quarantine data.
- Idempotent replay, stale revision skipping and correct updates.
- Complete rollback after an injected failure, successful recovery and zero surviving partial inserts.
- Equal-revision conflicts, backwards timestamps, active-transaction protection and invalid failure-injection parameters.
- Structured success and rollback logs.

## Limits

This is a single-process, tiny in-memory SQLite demonstration. It does not implement PostGIS, spatial indexing, real-world coordinate transformations, orchestration, multi-worker locking/retry policies, secrets management, service authentication, monitoring infrastructure, schema migrations, backups or production-scale performance measurement. Validation rules and a primary key alone cannot prove correctness of real source observations. A real deployment would need those environment-specific controls and an agreed policy for late observations and conflicting source systems.

## Portfolio maintenance

The portfolio build reads the checked-in `report.json`; it does not execute Python or connect to the original utility system. The standalone page is `example-spatial-etl/index.html`. Its guide, source viewer, and downloadable files are generated or copied from this directory.

Keep the invented fixtures separate from professional source material. After changing this example, regenerate its report, run its tests, and run the repository's build and publication checks. `npm run test:examples` tests all three companions in separate Python processes; Node.js 22+ is required for that wrapper, not for this Python example itself. Review generated-file differences before committing.

Repository instructions: [README](../../README.md) and [handoff](../../HANDOFF.md). These links refer to the checkout, not separately deployed documentation pages.
