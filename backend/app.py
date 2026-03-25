"""
app.py — Flask REST API for the Sudoku Solver backend.

Endpoints:
- GET /health
- POST /solve  { "board": [[...]], "algorithm": "backtracking" }
"""

from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

from solver import solve
from utils import validate_board

# ─────────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

# Allow cross-origin requests from the frontend (dev & prod)
CORS(app)


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────
def _error(message: str, status: int = 400):
    """Return a JSON error response."""
    return jsonify({"error": message}), status


def _parse_algorithm(data: dict) -> str:
    algo = data.get("algorithm", "backtracking")
    return algo if isinstance(algo, str) else "backtracking"


# ─────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    """
    GET /health
    Simple liveness check — returns 200 OK with a status message.
    """
    return jsonify({"status": "running"}), 200


@app.route("/solve", methods=["POST"])
def solve_endpoint():
    """
    POST /solve
    ─────────────────────────────────────────────────
    Request body (JSON):
    {
      "board": [
        [8, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 3, 6, 0, 0, 0, 0, 0],
        ...  (9 rows × 9 integers, 0 = empty)
      ]
    }

    Success response (200):
    {
      "board": [
        [8, 1, 2, 7, 5, 3, 6, 4, 9],
        ...
      ]
    }

    Error response (400 / 422 / 500):
    {
      "error": "Human-readable error message"
    }
    ─────────────────────────────────────────────────
    """
    data = request.get_json(silent=True)
    if data is None:
        return _error("Invalid or missing JSON body.", 400)

    if not isinstance(data, dict):
        return _error("Invalid puzzle", 400)

    if "board" not in data:
        return _error("Invalid puzzle", 400)

    algorithm = _parse_algorithm(data)

    try:
        board = validate_board(data["board"])
    except ValueError:
        return _error("Invalid puzzle", 400)

    solution, metrics = solve(board, algorithm=algorithm)  # type: ignore[arg-type]
    if solution is None:
        return _error("No solution exists", 422)

    return (
        jsonify(
            {
                "solution": solution,
                "algorithm": metrics["algorithm"],
                "time_ms": metrics["time_ms"],
                "steps": metrics["steps"],
            }
        ),
        200,
    )


# ─────────────────────────────────────────────────────────────────
# ERROR HANDLERS
# ─────────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return _error("Endpoint not found.", 404)


@app.errorhandler(405)
def method_not_allowed(e):
    return _error("Method not allowed.", 405)


@app.errorhandler(500)
def internal_error(e):
    return _error("Internal server error. Please try again.", 500)


# ─────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # debug=True enables auto-reload and detailed tracebacks in dev
    # Set debug=False (or use an env var) in production
    app.run(host="0.0.0.0", port=5000, debug=True)
