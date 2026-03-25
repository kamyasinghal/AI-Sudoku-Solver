# AI Sudoku Solver — Backend (Flask)

Backend for an AI Sudoku Solver web app. The frontend sends a 9×9 board (0 = empty) and gets back a solved board + performance metrics.

## Project structure

```
backend/
  app.py
  solver.py
  algorithms/
    backtracking.py
    greedy.py
    mrv.py
  utils.py
requirements.txt
vercel.json
README.md
```

## Run locally

```bash
pip install -r requirements.txt
cd backend
python app.py
```

Backend runs on `http://127.0.0.1:5000`.

## API

### `GET /health`

Response:

```json
{ "status": "running" }
```

### `POST /solve`

Request body:

```json
{
  "board": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ],
  "algorithm": "backtracking"
}
```

Algorithms:
- `backtracking`
- `greedy`
- `mrv`

Success response:

```json
{
  "solution": [[...]],
  "algorithm": "backtracking",
  "time_ms": 23,
  "steps": 542
}
```

Error response:

```json
{ "error": "Invalid puzzle" }
```

## Test with curl

```bash
curl -X POST http://127.0.0.1:5000/solve ^
  -H "Content-Type: application/json" ^
  -d "{\"board\":[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],\"algorithm\":\"mrv\"}"
```

## Deploy to Vercel

`vercel.json` routes all requests to `backend/app.py`, so the same Flask app can run locally and as a serverless function.
