AI Sudoku Solver

An AI-powered Sudoku Solver web application that demonstrates Constraint Satisfaction Problems (CSP) and search algorithms from Artificial Intelligence.

The system allows users to input Sudoku puzzles and solve them using different AI strategies such as Backtracking, Greedy heuristics, and MRV (Minimum Remaining Values).

Live Demo

https://ai-sudoku-solver-k7wf.vercel.app/

Features
Interactive 9×9 Sudoku board
Multiple solving algorithms
Performance metrics (steps and execution time)
Constraint Satisfaction Problem (CSP) implementation
Backend API for solving puzzles
Fully deployed web application
Tech Stack

Frontend

HTML
CSS
JavaScript

Backend

Python
Flask

Deployment

Vercel
Project Structure
AI-Sudoku-Solver
│
├ frontend
│  ├ index.html
│  ├ script.js
│  └ style.css
│
├ backend
│  ├ app.py
│  ├ solver.py
│  ├ algorithms
│  │  ├ backtracking.py
│  │  ├ greedy.py
│  │  └ mrv.py
│  └ utils.py
│
├ requirements.txt
├ vercel.json
└ README.md
AI Concepts Used

Sudoku can be modeled as a Constraint Satisfaction Problem (CSP).

Variables → Sudoku cells
Domain → Values from 1 to 9
Constraints →
Unique values per row
Unique values per column
Unique values per 3×3 grid

The solver explores the state space and finds valid assignments satisfying all constraints.

Algorithms Implemented
Backtracking

Classic recursive search algorithm that tries values and backtracks when constraints are violated.

Greedy Heuristic

Fills cells with deterministic values when only one candidate exists.

MRV (Minimum Remaining Values)

Chooses the variable with the smallest domain first, reducing the search space.

Running Locally

Install dependencies:

pip install -r requirements.txt

Run the backend:

cd backend
python app.py

Backend runs on:

http://127.0.0.1:5000
API Endpoints
Health Check
GET /health

Response

{
  "status": "running"
}
Solve Sudoku
POST /solve

Request body

{
  "board": [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
  ],
  "algorithm": "backtracking"
}

Available algorithms

backtracking
greedy
mrv

Success response

{
  "solution": [[...]],
  "algorithm": "backtracking",
  "time_ms": 23,
  "steps": 542
}

Error response

{
  "error": "Invalid puzzle"
}
Test API with curl
curl -X POST http://127.0.0.1:5000/solve \
-H "Content-Type: application/json" \
-d "{\"board\":[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],\"algorithm\":\"mrv\"}"
Deployment

The project is deployed on Vercel.

vercel.json routes API requests to the backend so the same Flask app works locally and as a serverless function.

Author

Kamya Singhal
BTech CSE
