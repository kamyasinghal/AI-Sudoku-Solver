from __future__ import annotations

from typing import Any

from utils import Board, find_empty, get_candidates, is_solved


def solve_backtracking(board: Board, metrics: dict[str, Any]) -> Board | None:
    """
    Classic recursive backtracking Sudoku solver.

    Metrics:
    - metrics["steps"]: number of recursive calls (search nodes)
    """

    def backtrack() -> bool:
        metrics["steps"] += 1

        empty = find_empty(board)
        if empty is None:
            return True

        r, c = empty
        for n in get_candidates(board, r, c):
            board[r][c] = n
            if backtrack():
                return True
            board[r][c] = 0

        return False

    if is_solved(board):
        return board

    return board if backtrack() else None
