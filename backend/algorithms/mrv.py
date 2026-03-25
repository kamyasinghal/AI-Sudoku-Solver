from __future__ import annotations

from typing import Any

from utils import Board, get_candidates, is_solved, iter_empty_cells


def _select_mrv_cell(board: Board) -> tuple[int, int, list[int]] | None:
    """
    Return (row, col, candidates) for the empty cell with the smallest domain.
    Returns None if there are no empty cells.
    """
    best: tuple[int, int, list[int]] | None = None
    best_len = 10

    for r, c in iter_empty_cells(board):
        cand = get_candidates(board, r, c)
        L = len(cand)
        if L == 0:
            # Dead end early
            return (r, c, cand)
        if L < best_len:
            best_len = L
            best = (r, c, cand)
            if L == 1:
                break

    return best


def solve_mrv(board: Board, metrics: dict[str, Any]) -> Board | None:
    """
    Backtracking solver with MRV heuristic (Minimum Remaining Values).

    Metrics:
    - metrics["steps"]: number of recursive calls (search nodes)
    """

    def backtrack() -> bool:
        metrics["steps"] += 1

        if is_solved(board):
            return True

        choice = _select_mrv_cell(board)
        if choice is None:
            return True

        r, c, cand = choice
        if not cand:
            return False

        # Try smaller values first for determinism
        for n in sorted(cand):
            board[r][c] = n
            if backtrack():
                return True
            board[r][c] = 0

        return False

    return board if backtrack() else None
