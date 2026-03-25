from __future__ import annotations

from typing import Iterable

Board = list[list[int]]  # 9x9 grid; 0 means empty


def validate_board(board: object) -> Board:
    """
    Validate the Sudoku board.

    Rules:
    - Must be a 9x9 list of ints.
    - Values must be in [0..9].
    - Non-zero givens must not conflict in any row/col/3x3 box.

    Returns the same board typed as Board.
    Raises ValueError on invalid input.
    """
    if not isinstance(board, list) or len(board) != 9:
        raise ValueError("Board must be a 9x9 array.")

    for r, row in enumerate(board):
        if not isinstance(row, list) or len(row) != 9:
            raise ValueError("Board must be a 9x9 array.")
        for c, v in enumerate(row):
            if not isinstance(v, int) or v < 0 or v > 9:
                raise ValueError(f'Invalid value at [{r}][{c}]. Expected integer 0..9.')

    # Check for conflicts among givens
    for r in range(9):
        seen: set[int] = set()
        for c in range(9):
            v = board[r][c]
            if v != 0:
                if v in seen:
                    raise ValueError("Invalid puzzle: duplicate value in a row.")
                seen.add(v)

    for c in range(9):
        seen = set()
        for r in range(9):
            v = board[r][c]
            if v != 0:
                if v in seen:
                    raise ValueError("Invalid puzzle: duplicate value in a column.")
                seen.add(v)

    for br in range(0, 9, 3):
        for bc in range(0, 9, 3):
            seen = set()
            for r in range(br, br + 3):
                for c in range(bc, bc + 3):
                    v = board[r][c]
                    if v != 0:
                        if v in seen:
                            raise ValueError("Invalid puzzle: duplicate value in a 3x3 box.")
                        seen.add(v)

    return board  # type: ignore[return-value]


def is_valid(board: Board, row: int, col: int, num: int) -> bool:
    """Return True if placing num at (row, col) respects Sudoku constraints."""
    if num < 1 or num > 9:
        return False

    # Row
    if any(board[row][c] == num for c in range(9)):
        return False

    # Column
    if any(board[r][col] == num for r in range(9)):
        return False

    # Box
    br = (row // 3) * 3
    bc = (col // 3) * 3
    for r in range(br, br + 3):
        for c in range(bc, bc + 3):
            if board[r][c] == num:
                return False

    return True


def find_empty(board: Board) -> tuple[int, int] | None:
    """Return (row, col) of the next empty cell, or None if solved."""
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0:
                return r, c
    return None


def get_candidates(board: Board, row: int, col: int) -> list[int]:
    """Return the list of valid candidates (1..9) for an empty cell."""
    if board[row][col] != 0:
        return []
    return [n for n in range(1, 10) if is_valid(board, row, col, n)]


def copy_board(board: Board) -> Board:
    return [row[:] for row in board]


def is_solved(board: Board) -> bool:
    return all(board[r][c] != 0 for r in range(9) for c in range(9))


def iter_empty_cells(board: Board) -> Iterable[tuple[int, int]]:
    for r in range(9):
        for c in range(9):
            if board[r][c] == 0:
                yield r, c
