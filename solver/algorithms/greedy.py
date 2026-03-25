from __future__ import annotations

from typing import Any

from algorithms.backtracking import solve_backtracking
from utils import Board, copy_board, get_candidates, is_solved, iter_empty_cells


def solve_greedy(board: Board, metrics: dict[str, Any]) -> Board | None:
    """
    Greedy heuristic:
    - Repeatedly fill any cell that has exactly one valid candidate.
    - If stuck and puzzle not solved, fallback to classic backtracking.

    Metrics:
    - metrics["steps"]: counts greedy fills + fallback backtracking recursion calls
    """

    changed = True
    while changed:
        changed = False
        to_fill: list[tuple[int, int, int]] = []

        for r, c in iter_empty_cells(board):
            cand = get_candidates(board, r, c)
            if len(cand) == 1:
                to_fill.append((r, c, cand[0]))

        if to_fill:
            for r, c, v in to_fill:
                board[r][c] = v
                metrics["steps"] += 1
            changed = True

    if is_solved(board):
        return board

    # Fallback: backtracking from the partially-filled state
    fallback_board = copy_board(board)
    solved = solve_backtracking(fallback_board, metrics)
    if solved is None:
        return None

    # Copy solved result back into the passed-in board
    for r in range(9):
        board[r][:] = solved[r][:]
    return board
