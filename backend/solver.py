"""
solver.py — Sudoku solver orchestrator
====================================

Exposes one entrypoint for the API layer:

  solve(board, algorithm) -> (solution | None, metrics)

Algorithms:
- backtracking: classic DFS search
- greedy: fill singles until stuck, then fallback to backtracking
- mrv: backtracking with Minimum Remaining Values heuristic

Metrics:
- time_ms: wall-clock execution time
- steps: algorithm-dependent counter (recursive calls / fills)
"""

from __future__ import annotations

from time import perf_counter
from typing import Any, Literal, TypedDict

from algorithms.backtracking import solve_backtracking
from algorithms.greedy import solve_greedy
from algorithms.mrv import solve_mrv
from utils import Board, copy_board

AlgorithmName = Literal["backtracking", "greedy", "mrv"]


class SolveMetrics(TypedDict):
    algorithm: str
    time_ms: int
    steps: int


_ALGORITHMS: dict[str, Any] = {
    "backtracking": solve_backtracking,
    "greedy": solve_greedy,
    "mrv": solve_mrv,
}


def solve(board: Board, algorithm: AlgorithmName = "backtracking") -> tuple[Board | None, SolveMetrics]:
    algo = algorithm if algorithm in _ALGORITHMS else "backtracking"

    # Steps are counted inside algorithm implementations
    algo_metrics: dict[str, Any] = {"steps": 0}

    working = copy_board(board)
    start = perf_counter()
    solution = _ALGORITHMS[algo](working, algo_metrics)
    end = perf_counter()

    metrics: SolveMetrics = {
        "algorithm": algo,
        "time_ms": int(round((end - start) * 1000)),
        "steps": int(algo_metrics.get("steps", 0)),
    }

    return solution, metrics
