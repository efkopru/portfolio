import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from demo import Edge, Graph, exhaustive_shared_network, fixture, independent_shortest_paths, report, validate


class NetworkAccessTests(unittest.TestCase):
    def test_worked_example_has_expected_global_optimum(self):
        graph = fixture()
        self.assertEqual(independent_shortest_paths(graph)["cost"], 12)
        shared = exhaustive_shared_network(graph)
        self.assertEqual(shared["cost"], 10)
        self.assertEqual(shared["subsets_checked"], 32)
        self.assertEqual({(edge.a, edge.b) for edge in shared["selected_edges"]}, {("H", "S"), ("H", "T1"), ("H", "T2")})

    def test_baseline_deduplicates_shared_edges(self):
        graph = Graph((Edge("S", "H", 4), Edge("H", "A", 1), Edge("H", "B", 1)), "S", ("A", "B"))
        baseline = independent_shortest_paths(graph)
        self.assertEqual(baseline["path_sum"], 10)
        self.assertEqual(baseline["cost"], 6)
        self.assertEqual(exhaustive_shared_network(graph)["cost"], 6)

    def test_single_target_agrees_with_shortest_path(self):
        graph = fixture()
        graph = Graph(graph.edges, graph.source, ("T1",))
        self.assertEqual(independent_shortest_paths(graph)["cost"], exhaustive_shared_network(graph)["cost"])

    def test_fixture_sizes_and_costs(self):
        for targets, edges, cost in ((2, 5, 10), (3, 9, 13), (4, 13, 16)):
            with self.subTest(targets=targets):
                graph = fixture(targets)
                self.assertEqual(len(graph.edges), edges)
                result = exhaustive_shared_network(graph)
                self.assertEqual(result["cost"], cost)
                self.assertEqual(result["subsets_checked"], 2 ** edges)
                self.assertLessEqual(result["cost"], independent_shortest_paths(graph)["cost"])

    def test_disconnected_target_is_rejected_by_both_methods(self):
        graph = Graph((Edge("S", "A", 1), Edge("X", "T", 1)), "S", ("T",))
        for solver in (independent_shortest_paths, exhaustive_shared_network):
            with self.assertRaisesRegex(ValueError, "unreachable"):
                solver(graph)

    def test_invalid_cost_duplicate_self_loop_and_empty_node(self):
        for edges in ((Edge("S", "T", -1),), (Edge("S", "T", 0),), (Edge("S", "T", True),),
                      (Edge("S", "T", 1.5),), (Edge("S", "T", 1), Edge("T", "S", 1)),
                      (Edge("S", "S", 1),), (Edge("", "T", 1),)):
            with self.subTest(edges=edges), self.assertRaises(ValueError):
                validate(Graph(edges, "S", ("T",)))

    def test_invalid_terminals(self):
        graph = fixture()
        for source, targets in (("missing", ("T1",)), ("S", ()), ("S", ("T1", "T1")), ("S", ("S",)), ("S", ("missing",))):
            with self.subTest(source=source, targets=targets), self.assertRaises(ValueError):
                validate(Graph(graph.edges, source, targets))

    def test_hard_cap_prevents_unbounded_exponential_search(self):
        graph = Graph(tuple(Edge("S", f"T{i}", 1) for i in range(17)), "S", ("T1",))
        with self.assertRaisesRegex(ValueError, "16"):
            exhaustive_shared_network(graph)

    def test_input_order_does_not_change_solution(self):
        graph = fixture()
        reversed_graph = Graph(tuple(Edge(e.b, e.a, e.cost) for e in reversed(graph.edges)), "S", tuple(reversed(graph.targets)))
        self.assertEqual(exhaustive_shared_network(graph), exhaustive_shared_network(reversed_graph))

    def test_selected_edge_objects_are_safe_for_unsorted_input(self):
        graph = Graph((Edge("S", "T1", 6), Edge("S", "T2", 6), Edge("S", "H", 4),
                       Edge("H", "T1", 3), Edge("H", "T2", 3)), "S", ("T2", "T1"))
        reversed_graph = Graph(tuple(Edge(edge.b, edge.a, edge.cost)
                                     for edge in reversed(graph.edges)), "S", ("T1", "T2"))
        normalized = validate(graph)
        for solver, expected_cost in ((independent_shortest_paths, 12),
                                      (exhaustive_shared_network, 10)):
            with self.subTest(solver=solver.__name__):
                result = solver(graph)
                selected_edges = result["selected_edges"]
                self.assertEqual(sum(edge.cost for edge in selected_edges), expected_cost)
                self.assertEqual(sum(edge.cost for edge in selected_edges), result["cost"])
                self.assertEqual(selected_edges, solver(reversed_graph)["selected_edges"])
                self.assertEqual(selected_edges, tuple(normalized.edges[index]
                                                       for index in result["selected"]))
                self.assertEqual(len(selected_edges), len(set(selected_edges)))

    def test_report_contract_and_environment_disclosure(self):
        result = report()
        self.assertIsInstance(result["title"], str)
        self.assertIn("synthetic", result["disclosure"])
        self.assertTrue(any("environment" in note.lower() for note in result["notes"]))
        for metric in result["metrics"]:
            self.assertIsInstance(metric["label"], str)
            self.assertIsInstance(metric["value"], (int, float, str))
        for table in result["tables"]:
            self.assertIsInstance(table["heading"], str)
            self.assertTrue(all(isinstance(header, str) for header in table["headers"]))
            for row in table["rows"]:
                self.assertEqual(len(row), len(table["headers"]))
                self.assertTrue(all(isinstance(cell, (str, int, float)) for cell in row))

    def test_cli_writes_reusable_json_report(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "report.json"
            subprocess.run([sys.executable, str(Path(__file__).with_name("demo.py")), "--report", str(output)], check=True, capture_output=True)
            self.assertEqual(json.loads(output.read_text(encoding="utf-8"))["metrics"][1]["value"], 10)

    def test_cli_stdout_is_portable_json(self):
        process = subprocess.run([sys.executable, str(Path(__file__).with_name("demo.py"))], check=True, capture_output=True)
        self.assertEqual(json.loads(process.stdout.decode("ascii"))["metrics"][1]["value"], 10)


if __name__ == "__main__":
    unittest.main()
