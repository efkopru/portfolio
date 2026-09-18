# Shared edges and multiple-target access

This newly authored, standard-library Python teaching companion explains one network-planning decision. It is **not** a reimplementation of the dissertation formulation, a reproduction of its experiments, or a claim of a new optimization algorithm. Every graph here is invented; costs are abstract positive integers, not real distances, travel times, or operational results.

## Run from the portfolio root

Python 3.10 or newer. No dependencies, solver installation, credentials, downloads, or real records are required.

```sh
python examples/network-access/demo.py --report examples/network-access/report.json
python -m unittest discover -s examples/network-access -p "test_*.py"
```

The first command regenerates the checked-in report, including fresh measured timings. Without `--report`, it prints JSON. Results are deterministic except timings and environment metadata. A report is evidence of this tiny example only.

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
- The actual measured benchmark table and Python/OS/architecture metadata are in [report.json](report.json) and displayed on the portfolio research page. Timings vary with hardware and load; the checked-in report is a local measurement, not a cross-machine performance promise or dissertation benchmark.

Expected objective checks are 12 vs 10, 18 vs 13, and 24 vs 16 (shortest-path union vs shared network). Exhaustive enumeration scales exponentially and is deliberately unsuitable for production-sized spatial networks.

## Public source and truthful citations

The existing public research code uses a separate R OMPR/ROI GLPK model, with shared binary edge decisions and target-specific flow variables. It includes unit-cost network examples and convex-hull preprocessing. This companion neither calls that code nor validates its preprocessing assumptions.

**Software/source citation:** Kopru, Esad (GitHub account `efkopru`). *gemini-shortest-path*, public software repository, revision `bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388`. Accessed 18 September 2026. [Pinned repository](https://github.com/efkopru/gemini-shortest-path/tree/bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388); [public R formulation](https://github.com/efkopru/gemini-shortest-path/blob/bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388/mdsp_final.R).

**Dissertation record:** Kopru, Esad. *Modeling Integer Programming To Multiple Target Access Problem*. PhD, Geospatial Information Science, The University of Texas at Dallas, Spring 2024. The [university's doctoral degrees awarded record](https://graduate.utdallas.edu/fsa/doctoral-degrees-awarded/2023-2024-doctoral-degrees-awarded/) verifies the name, degree, term, and title. This is a citation to that public record, not a claim that a full thesis PDF or journal paper is hosted here. No DOI or journal publication is asserted.

No unpublished manuscript, employer code, client records, or original research benchmark outputs were used in this teaching example.
