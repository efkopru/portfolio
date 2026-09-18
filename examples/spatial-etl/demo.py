"""Dependency-free educational ETL reconstruction; no production data or services."""

import argparse
from collections import Counter
from contextlib import closing
from dataclasses import asdict, dataclass
from datetime import datetime
import json
import logging
import math
from pathlib import Path
import re
import sqlite3


LOGGER = logging.getLogger("spatial_etl")
CRS = "LOCAL:DEMO_CARTESIAN"
FIELDS = {"id", "crs", "x", "y", "condition", "inspected_at", "revision"}
MAX_REVISION = 2**63 - 1


@dataclass(frozen=True)
class Record:
    id: str
    crs: str
    x: float
    y: float
    condition: str
    inspected_at: str
    revision: int


class InjectedFailure(RuntimeError):
    """Expected failure used to verify an all-or-nothing load."""


class RecordConflict(ValueError):
    """Source revisions disagree or reverse inspection chronology."""


def event(name, **details):
    """Structured events stay on stderr; stdout remains machine-readable JSON."""
    LOGGER.info(json.dumps({"event": name, **details}, sort_keys=True))


def validate_record(raw):
    if not isinstance(raw, dict):
        raise ValueError("record must be an object")
    if set(raw) != FIELDS:
        missing, extra = sorted(FIELDS - set(raw)), sorted(set(raw) - FIELDS)
        raise ValueError(f"schema mismatch: missing={missing}, extra={extra}")
    if not isinstance(raw["id"], str) or not re.fullmatch(r"SYN-[0-9]{3}", raw["id"]):
        raise ValueError("id must match SYN-NNN")
    if raw["crs"] != CRS:
        raise ValueError(f"crs must be {CRS}")
    for axis in ("x", "y"):
        value = raw[axis]
        if type(value) not in (int, float) or not 0 <= value <= 10000 or not math.isfinite(value):
            raise ValueError(f"{axis} must be a finite number in [0, 10000] metres")
    if not isinstance(raw["condition"], str) or raw["condition"] not in {"clear", "attention"}:
        raise ValueError("condition must be clear or attention")
    stamp = raw["inspected_at"]
    if not isinstance(stamp, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z", stamp):
        raise ValueError("inspected_at must be an ISO UTC second: YYYY-MM-DDTHH:MM:SSZ")
    try:
        datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as error:
        raise ValueError("inspected_at contains an invalid calendar date or time") from error
    if type(raw["revision"]) is not int or not 1 <= raw["revision"] <= MAX_REVISION:
        raise ValueError("revision must be a positive SQLite-sized integer")
    return Record(**{**raw, "x": float(raw["x"]), "y": float(raw["y"])})


def validate_batch(rows):
    if not isinstance(rows, list):
        raise ValueError("input must be a JSON array")
    # Reject every occurrence of a duplicate ID, regardless of source ordering.
    ids = Counter(row["id"] for row in rows if isinstance(row, dict) and isinstance(row.get("id"), str))
    valid, rejected = [], []
    for position, raw in enumerate(rows, 1):
        identifier = raw.get("id", "(missing)") if isinstance(raw, dict) else "(not an object)"
        try:
            record = validate_record(raw)
            if ids[record.id] > 1:
                raise ValueError("duplicate id in batch; all occurrences quarantined")
            valid.append(record)
        except ValueError as error:
            rejected.append({"row": position, "id": str(identifier), "reason": str(error), "record": raw})
    event("validation_completed", input=len(rows), accepted=len(valid), rejected=len(rejected))
    return valid, rejected


def initialize(connection):
    connection.executescript("""
        CREATE TABLE IF NOT EXISTS inspections (
            id TEXT PRIMARY KEY,
            crs TEXT NOT NULL CHECK(crs = 'LOCAL:DEMO_CARTESIAN'),
            x REAL NOT NULL CHECK(x BETWEEN 0 AND 10000),
            y REAL NOT NULL CHECK(y BETWEEN 0 AND 10000),
            condition TEXT NOT NULL CHECK(condition IN ('clear', 'attention')),
            inspected_at TEXT NOT NULL,
            revision INTEGER NOT NULL CHECK(revision > 0)
        );
    """)


def snapshot(connection):
    return connection.execute(
        "SELECT id, crs, x, y, condition, inspected_at, revision FROM inspections ORDER BY id"
    ).fetchall()


def load(connection, records, fail_after=None):
    """Apply a validated batch atomically, skipping stale or identical revisions."""
    if connection.in_transaction:
        raise ValueError("load requires a connection without an active transaction")
    if fail_after is not None and (type(fail_after) is not int or not 1 <= fail_after <= len(records)):
        raise ValueError("fail_after must identify a record within this batch")
    # Revalidate even caller-created Record objects before any database mutation.
    checked, rejected = validate_batch([asdict(record) for record in records])
    if rejected:
        raise ValueError("load accepts only validated, uniquely identified records")
    counts = {"inserted": 0, "updated": 0, "unchanged": 0, "stale": 0}
    connection.execute("BEGIN IMMEDIATE")
    try:
        for index, record in enumerate(checked, 1):
            values = (record.id, record.crs, record.x, record.y, record.condition, record.inspected_at, record.revision)
            current = connection.execute(
                "SELECT id, crs, x, y, condition, inspected_at, revision FROM inspections WHERE id = ?",
                (record.id,),
            ).fetchone()
            if current is None:
                connection.execute("INSERT INTO inspections VALUES (?, ?, ?, ?, ?, ?, ?)", values)
                counts["inserted"] += 1
            elif record.revision < current[6]:
                counts["stale"] += 1
            elif record.revision == current[6]:
                if current != values:
                    raise RecordConflict(f"{record.id}: changed payload with unchanged revision")
                counts["unchanged"] += 1
            else:
                if record.inspected_at < current[5]:
                    raise RecordConflict(f"{record.id}: newer revision has an older inspection time")
                connection.execute(
                    "UPDATE inspections SET crs=?, x=?, y=?, condition=?, inspected_at=?, revision=? WHERE id=?",
                    (*values[1:], record.id),
                )
                counts["updated"] += 1
            if index == fail_after:
                raise InjectedFailure(f"deliberate failure after record {index}")
        connection.commit()
    except Exception as error:
        connection.rollback()
        event("load_rolled_back", error=type(error).__name__, records=len(checked))
        raise
    event("load_committed", records=len(checked), **counts)
    return counts


def run_demo():
    source = json.loads(Path(__file__).with_name("records.json").read_text(encoding="utf-8"))
    accepted, quarantine = validate_batch(source)
    with closing(sqlite3.connect(":memory:")) as connection:
        initialize(connection)
        initial = load(connection, accepted)
        baseline = snapshot(connection)
        replay = load(connection, accepted)
        if snapshot(connection) != baseline:
            raise AssertionError("identical replay changed database state")
        updates, problems = validate_batch([
            {**asdict(accepted[0]), "condition": "attention", "revision": 2, "inspected_at": "2026-01-02T09:00:00Z"},
            {**asdict(accepted[1]), "x": 1820, "revision": 2, "inspected_at": "2026-01-02T09:10:00Z"},
            {**asdict(accepted[2]), "id": "SYN-012", "x": 5000, "y": 5100, "revision": 1},
        ])
        if problems:
            raise AssertionError("invalid demonstration update fixture")
        try:
            load(connection, updates, fail_after=2)
        except InjectedFailure:
            rollback_verified = snapshot(connection) == baseline
        else:
            raise AssertionError("failure injection did not run")
        if not rollback_verified:
            raise AssertionError("failed transaction changed database state")
        recovery = load(connection, updates)
        recovered = snapshot(connection)
        recovered_replay = load(connection, updates)
        stale_replay = load(connection, accepted)
        if snapshot(connection) != recovered:
            raise AssertionError("replay changed recovered database state")
        final = snapshot(connection)
    phases = [("Initial load", initial), ("Identical replay", replay), ("Recovery retry", recovery),
              ("Recovered replay", recovered_replay), ("Older source replay", stale_replay)]
    report = {
        "title": "Synthetic spatial ETL: validation, replay and recovery",
        "disclosure": "Educational reconstruction using invented records on a local Cartesian grid. No client data, Earth coordinates, or production performance claims.",
        "metrics": [
            {"label": "Synthetic input rows", "value": str(len(source))},
            {"label": "Accepted initial rows", "value": str(len(accepted))},
            {"label": "Quarantined input rows", "value": str(len(quarantine))},
            {"label": "Records after recovery", "value": str(len(final))},
            {"label": "Rollback state check", "value": "Passed" if rollback_verified else "Failed"},
        ],
        "tables": [
            {"heading": "Committed batch results", "headers": ["Batch", "Inserted", "Updated", "Unchanged", "Stale skipped"],
             "rows": [[name, result["inserted"], result["updated"], result["unchanged"], result["stale"]] for name, result in phases]},
            {"heading": "Quarantine review", "headers": ["Input row", "Synthetic ID", "Reason"],
             "rows": [[item["row"], item["id"], item["reason"]] for item in quarantine]},
            {"heading": "Recovered database state", "headers": ["Synthetic ID", "X (m)", "Y (m)", "Condition", "Revision"],
             "rows": [[row[0], row[2], row[3], row[4], row[6]] for row in final]},
        ],
        "notes": [
            "CRS is LOCAL:DEMO_CARTESIAN: arbitrary origin, x right/east, y up/north, metres, valid extent 0 to 10000 on each axis. It has no Earth reference and cannot be overlaid on a real map.",
            "A deliberate failure after two updates left every stored value identical to the pre-load snapshot. A subsequent retry committed two updates and one insertion.",
            "Repeated batches perform no writes when payload and revision match. Older revisions are skipped. Conflicting equal revisions or reversed inspection dates abort the complete transaction.",
            "Quarantine retains each rejected input and its reason. Both occurrences of a duplicated ID are rejected; source ordering never chooses a winner.",
            "SQLite is used for a portable transaction demonstration, not presented as PostGIS, a spatial index, a production job scheduler, or a performance benchmark.",
        ],
        "checks": {"rollback_verified": rollback_verified, "identical_replay_verified": True, "recovered_replay_verified": True},
        "quarantine": quarantine,
    }
    event("demo_completed", stored=len(final), rollback_verified=rollback_verified)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, help="also save the deterministic report as UTF-8 JSON")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    output = json.dumps(run_demo(), indent=2, ensure_ascii=True) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output, encoding="utf-8")
        event("report_written", path=str(args.report))
    print(output, end="")


if __name__ == "__main__":
    main()
