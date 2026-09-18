"""Bounded, synthetic teaching example. Not the dissertation solver or benchmark."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import heapq
import json
from pathlib import Path
import platform
import statistics
import time


MAX_EDGES = 16
REPEATS = 5
SOURCE_COMMIT = "bc917f2a679f0ef624b15d2e6b4a3dc5fc8db388"


@dataclass(frozen=True, order=True)
class Edge:
    a: str
    b: str
    cost: int


@dataclass(frozen=True)
class Graph:
    edges: tuple[Edge, ...]
    source: str
    targets: tuple[str, ...]


def validate(graph: Graph) -> Graph:
    """Normalize a tiny simple undirected graph; integer costs avoid rounding."""
    if not graph.edges or len(graph.edges) > MAX_EDGES:
        raise ValueError(f"Use 1 to {MAX_EDGES} edges only; exhaustive search is exponential.")
    seen: set[tuple[str, str]] = set()
    normalized = []
    nodes = set()
    for edge in graph.edges:
        if not all(isinstance(node, str) and node for node in (edge.a, edge.b)):
            raise ValueError("Node IDs must be nonempty strings.")
        if edge.a == edge.b or type(edge.cost) is not int or edge.cost <= 0:
            raise ValueError("Edges need different endpoints and positive integer costs.")
        a, b = sorted((edge.a, edge.b))
        if (a, b) in seen:
            raise ValueError("Duplicate undirected edge.")
        seen.add((a, b))
        nodes.update((a, b))
        normalized.append(Edge(a, b, edge.cost))
    if (graph.source not in nodes or not graph.targets
            or len(set(graph.targets)) != len(graph.targets)
            or any(target not in nodes or target == graph.source for target in graph.targets)):
        raise ValueError("Use an existing source and distinct existing non-source targets.")
    return Graph(tuple(sorted(normalized)), graph.source, tuple(sorted(graph.targets)))


def reaches_targets(graph: Graph, selected: tuple[int, ...]) -> bool:
    adjacency: dict[str, list[str]] = {}
    for index in selected:
        edge = graph.edges[index]
        adjacency.setdefault(edge.a, []).append(edge.b)
        adjacency.setdefault(edge.b, []).append(edge.a)
    reached = {graph.source}
    pending = [graph.source]
    while pending:
        for node in adjacency.get(pending.pop(), ()):
            if node not in reached:
                reached.add(node)
                pending.append(node)
    return set(graph.targets).issubset(reached)


def independent_shortest_paths(graph: Graph) -> dict:
    """Dijkstra paths, followed by a deduplicated union-cost comparison.

    Use selected_edges to inspect the solution independently of input ordering.
    The auxiliary selected indices refer to validate(graph).edges, not input order.
    """
    graph = validate(graph)
    adjacency: dict[str, list[tuple[str, int, int]]] = {}
    for index, edge in enumerate(graph.edges):
        adjacency.setdefault(edge.a, []).append((edge.b, edge.cost, index))
        adjacency.setdefault(edge.b, []).append((edge.a, edge.cost, index))
    distances = {graph.source: 0}
    previous: dict[str, tuple[str, int]] = {}
    queue = [(0, graph.source)]
    while queue:
        distance, node = heapq.heappop(queue)
        if distance != distances[node]:
            continue
        for neighbor, cost, index in adjacency.get(node, ()):
            alternative = distance + cost
            if alternative < distances.get(neighbor, float("inf")):
                distances[neighbor] = alternative
                previous[neighbor] = (node, index)
                heapq.heappush(queue, (alternative, neighbor))
    selected: set[int] = set()
    paths = []
    for target in graph.targets:
        if target not in distances:
            raise ValueError("At least one target is unreachable.")
        node = target
        path = [node]
        while node != graph.source:
            node, edge_index = previous[node]
            selected.add(edge_index)
            path.append(node)
        paths.append({"target": target, "path": list(reversed(path)), "cost": distances[target]})
    return {
        "cost": sum(graph.edges[index].cost for index in selected),
        "path_sum": sum(path["cost"] for path in paths),
        "selected": tuple(sorted(selected)),
        "selected_edges": tuple(graph.edges[index] for index in sorted(selected)),
        "paths": paths,
    }


def exhaustive_shared_network(graph: Graph) -> dict:
    """Find the minimum selected-edge cost by checking every subset, no pruning.

    Use selected_edges to inspect the solution independently of input ordering.
    The auxiliary selected indices refer to validate(graph).edges, not input order.
    """
    graph = validate(graph)
    best_cost = float("inf")
    best_selection = None
    subsets = 1 << len(graph.edges)
    for mask in range(subsets):
        selected = tuple(index for index in range(len(graph.edges)) if mask & (1 << index))
        feasible = reaches_targets(graph, selected)
        cost = sum(graph.edges[index].cost for index in selected)
        if feasible and cost < best_cost:
            best_cost = cost
            best_selection = selected
    if best_selection is None:
        raise ValueError("At least one target is unreachable.")
    return {"cost": best_cost, "selected": best_selection,
            "selected_edges": tuple(graph.edges[index] for index in best_selection),
            "subsets_checked": subsets}


def fixture(target_count: int = 2) -> Graph:
    """Invented cost units, no geographic coordinates or research data."""
    if target_count not in (2, 3, 4):
        raise ValueError("The published fixtures have 2, 3, or 4 targets.")
    targets = tuple(f"T{index + 1}" for index in range(target_count))
    edges = [Edge("S", "H", 4)]
    for target in targets:
        edges.extend((Edge("H", target, 3), Edge("S", target, 6)))
    if target_count >= 3:
        edges.extend(Edge(targets[index], targets[index + 1], 10) for index in range(target_count - 1))
    if target_count == 4:
        edges.append(Edge("T1", "T4", 10))
    return validate(Graph(tuple(edges), "S", targets))


def timed_median(function, graph: Graph) -> tuple[dict, float]:
    function(graph)  # One untimed warm-up per method and fixture.
    times = []
    result = None
    for _ in range(REPEATS):
        start = time.perf_counter_ns()
        result = function(graph)
        times.append((time.perf_counter_ns() - start) / 1_000_000)
    return result, round(statistics.median(times), 6)


def report() -> dict:
    graph = fixture()
    baseline = independent_shortest_paths(graph)
    exact = exhaustive_shared_network(graph)
    benchmark_rows = []
    for target_count in (2, 3, 4):
        instance = fixture(target_count)
        paths, paths_ms = timed_median(independent_shortest_paths, instance)
        shared, shared_ms = timed_median(exhaustive_shared_network, instance)
        benchmark_rows.append([
            target_count, len(instance.edges), shared["subsets_checked"],
            paths["cost"], shared["cost"], paths_ms, shared_ms,
        ])
    chosen_edges = exact["selected_edges"]
    return {
        "title": "Why shared edges change a network-access decision",
        "disclosure": "New synthetic teaching companion, not the dissertation implementation or its research benchmark. Costs are invented units, not travel times or distances.",
        "metrics": [
            {"label": "Independent shortest-path union cost", "value": baseline["cost"]},
            {"label": "Minimum shared-network cost", "value": exact["cost"]},
            {"label": "Exhaustively checked edge subsets", "value": exact["subsets_checked"]},
        ],
        "tables": [
            {
                "heading": "Worked example: independent routes",
                "headers": ["Target", "Route", "Route cost"],
                "rows": [[path["target"], " → ".join(path["path"]), path["cost"]] for path in baseline["paths"]],
            },
            {
                "heading": "Worked example: selected shared-network edges",
                "headers": ["Edge", "Cost counted once"],
                "rows": [[f"{edge.a} ↔ {edge.b}", edge.cost] for edge in chosen_edges],
            },
            {
                "heading": "Measured synthetic micro-benchmark (environment-specific)",
                "headers": ["Targets", "Edges", "Subsets", "Path-union cost", "Shared cost", "Dijkstra median ms", "Exhaustive median ms"],
                "rows": benchmark_rows,
            },
        ],
        "notes": [
            "For each target the direct path costs 6, versus 7 through H. Yet sharing S–H gives a total selected-edge cost of 4 + 3 + 3 = 10 instead of 6 + 6 = 12. Individual journeys need not become shorter.",
            "The comparable baseline is the union of independent shortest-path edges, counted once. Summing journey costs would double-count any shared edge.",
            "Solver settings: simple undirected graphs; positive integer edge costs; all targets required; optional intermediate nodes; exhaustive enumeration of every subset; no pruning, tolerance, heuristic, random seed, external solver, or time limit; single process; hard cap 16 edges (65,536 subsets).",
            f"Timings are medians of {REPEATS} runs after one warm-up, measured with perf_counter_ns, including validation and solving but excluding fixture creation, report assembly, and file I/O. They are illustrative, not a scalable algorithm comparison.",
            f"Measured environment: {platform.python_implementation()} {platform.python_version()}, {platform.system()} {platform.release()}, {platform.machine()}. Workload and timing noise vary by machine; rerunning overwrites timings.",
            "This familiar minimum connecting-subgraph example is not a novelty claim, proof about the original formulation, or validation of convex-hull preprocessing. The public R source uses a separate OMPR/GLPK formulation with flow variables.",
            "No unpublished manuscript, employer code, client records, or real location data is included. No journal publication or DOI is asserted.",
        ],
        "sources": [
            {"label": "Public research code, pinned revision", "url": f"https://github.com/efkopru/gemini-shortest-path/tree/{SOURCE_COMMIT}"},
            {"label": "UT Dallas doctoral record (Spring 2024)", "url": "https://graduate.utdallas.edu/fsa/doctoral-degrees-awarded/2023-2024-doctoral-degrees-awarded/"},
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, metavar="PATH", help="Write the measured JSON report to PATH.")
    args = parser.parse_args()
    result = report()
    serialized = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(serialized, encoding="utf-8")
        print(f"Report written: {args.report}")
    else:
        # ASCII JSON also works when Windows redirects stdout using a legacy code page.
        print(json.dumps(result, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
