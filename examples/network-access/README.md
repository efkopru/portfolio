# Shared edges and multiple-target access

This independently authored, standard-library Python teaching companion explains one network-planning decision. It is **not** a reimplementation of the dissertation formulation, a reproduction of its experiments, or a claim of a new optimization algorithm. Every graph here is invented; costs are abstract positive integers, not real distances, travel times, or operational results.

Guide reviewed against the included source and tests on 25 September 2026.

## Run from the portfolio root

Python 3.10 or newer. No third-party dependencies, solver installation, credentials, downloads, or real records are required. On Windows:

```powershell
py -3 examples/network-access/demo.py
py -3 -m unittest discover -s examples/network-access -p "test_*.py" -v
```

Substitute `python` or `python3` for `py -3` on other installations. The first command prints JSON without changing the checked-in report. Python may create `__pycache__` when tests import the module. To intentionally regenerate the report:

```powershell
py -3 examples/network-access/demo.py --report examples/network-access/report.json
```

`--report` overwrites the named file, including fresh measured timings, and prints the output path. Results are deterministic except timings and environment metadata. A report is evidence of this tiny example only; do not regenerate recorded timings just to refresh the documentation.

## Plain-language question

If several destinations need access from one source, should every destination receive its individually shortest route, or can shared infrastructure reduce the total selected-edge cost? These are different objectives. Choosing shared edges can reduce construction cost while making an individual trip longer.

The worked example contains source `S`, intermediate node `H`, targets `T1` and `T2`, and five undirected edges:

| Edge | Invented cost |
| --- | ---: |
| S to T1 | 6 |
| S to T2 | 6 |
| S to H | 4 |
| H to T1 | 3 |
| H to T2 | 3 |

Each independently shortest path is a direct edge costing 6, because the route through H costs 7. Their union costs **12**. Selecting S to H and the two H-to-target edges instead costs **10**, counting the shared edge only once. Exhaustively checking all **32** edge subsets proves that 10 is optimal for this small graph and this exact objective.

The baseline is the *union* of the independently shortest paths, not the sum of journey costs. The code explicitly deduplicates common edges. A separate test demonstrates a case where journey costs sum to 10 but their edge union costs 6.

## Solver settings and measured benchmark

Both solvers receive the identical validated graph. The baseline uses Dijkstra's algorithm; the exact teaching solver enumerates every subset of edges and checks source-to-target reachability. Its objective is the sum of selected edge costs, each charged once. All targets must be reachable; intermediate nodes are optional. This is a familiar minimum connecting-subgraph setting, not a new general formulation.

- Simple, undirected graphs, positive integer costs, no parallel edges or self-loops.
- Exact enumeration with **16 edges maximum**, or at most 65,536 subsets. Larger inputs fail immediately.
- No pruning, numerical tolerance, heuristic, randomness, external solver, parallelism, or time limit. Equal-cost solutions keep the first subset in the normalized deterministic edge order.
- Fixtures: 2 targets / 5 edges, 3 targets / 9 edges, 4 targets / 13 edges. Added target-to-target edges cost 10; all data is generated in `fixture()`.
- One untimed warm-up and five measured runs per method per graph. Reported runtime is median milliseconds from `perf_counter_ns`, including input validation and solving, excluding fixture creation and report/file I/O.
- The actual measured benchmark table and Python/OS/architecture metadata are in [report.json](report.json) and displayed on the standalone `example-network-access/index.html` page. The doctoral research page intentionally keeps its original project explanation separate and does not display this companion. Timings vary with hardware and load; the checked-in report is a local measurement, not a cross-machine performance promise or dissertation benchmark.

Expected objective checks are 12 vs 10, 18 vs 13, and 24 vs 16 (shortest-path union vs shared network). Exhaustive enumeration scales exponentially and is deliberately unsuitable for production-sized spatial networks.

## Public source and truthful citations

The existing public research code uses a separate R OMPR/ROI GLPK model, with shared binary edge decisions and target-specific flow variables. It includes unit-cost network examples and convex-hull preprocessing. This companion neither calls that code nor validates its preprocessing assumptions.

**Software/source citation:** Kopru, Esad (GitHub account `efkopru`). *gemini-shortest-path*, public software repository, revision `bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388`. Accessed 18 September 2026. [Pinned repository](https://github.com/efkopru/gemini-shortest-path/tree/bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388); [public R formulation](https://github.com/efkopru/gemini-shortest-path/blob/bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388/mdsp_final.R).

**Dissertation record:** Kopru, Esad. *Modeling Integer Programming To Multiple Target Access Problem*. PhD, Geospatial Information Science, The University of Texas at Dallas, Spring 2024. The [university's doctoral degrees awarded record](https://graduate.utdallas.edu/fsa/doctoral-degrees-awarded/2023-2024-doctoral-degrees-awarded/) verifies the name, degree, term, and title. This is a citation to that public record, not a claim that a full thesis PDF or journal paper is hosted here. No DOI or journal publication is asserted.

No unpublished manuscript, employer code, client records, or original research benchmark outputs were used in this teaching example.

## Portfolio maintenance

The portfolio build reads the checked-in report; it does not run either solver. The guide and source viewers are generated from this directory. Keep the teaching example separate from the original research and preserve the distinction between shortest-path union cost and total journey cost.

After changing the example, run its tests and deliberately regenerate the report only when its logic or recorded measurement is meant to change. Review all timing and environment differences, then run the repository's build and publication checks. `npm run test:examples` tests all three companions in separate Python processes; Node.js 22+ is required for that wrapper, not for this Python example itself.

Repository instructions: [README](../../README.md) and [handoff](../../HANDOFF.md). These links refer to the checkout, not separately deployed documentation pages.
