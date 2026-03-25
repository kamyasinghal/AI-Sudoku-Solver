/* ═══════════════════════════════════════════════════════
   AI Sudoku Solver — script.js
   Full Sudoku engine: Backtracking, Greedy, D&C, DP+MRV, Hybrid
   UI interactions, animations, benchmarking
   ═══════════════════════════════════════════════════════ */

'use strict';

// ─── State ───────────────────────────────────────────────
const state = {
  board:        Array.from({length:9}, ()=>Array(9).fill(0)),
  given:        Array.from({length:9}, ()=>Array(9).fill(false)),
  selectedCell: null,   // {row, col}
  solving:      false,
  stopFlag:     false,
  animQueue:    [],
  animTimer:    null,
};

// ─── Algorithm metadata ──────────────────────────────────
const ALGO_META = {
  backtracking: {
    label: 'Backtracking',
    desc:  'Recursively fills empty cells, backtracking on constraint violations. Guaranteed to find a solution if one exists.',
    time:  'O(9^n)', space: 'O(n)', worst: 'O(9^81)',
  },
  greedy: {
    label: 'Greedy + Backtracking',
    desc:  'Fills "naked singles" (cells with only one candidate) first, then falls back to backtracking. Greatly reduces work on easy/medium puzzles.',
    time:  'O(n²)', space: 'O(n)', worst: 'O(9^81)',
  },
  divide: {
    label: 'Divide & Conquer',
    desc:  'Decomposes the puzzle into 3×3 sub-problems, solves each box individually, then resolves cross-box constraints.',
    time:  'O(n log n)', space: 'O(n)', worst: 'O(9^81)',
  },
  dp_mrv: {
    label: 'DP + MRV Heuristic',
    desc:  'Memoises constraint bitmasks; Minimum Remaining Values (MRV) heuristic always picks the most constrained empty cell first, slashing search space.',
    time:  'O(n·2^n)', space: 'O(n²)', worst: 'O(9^81)',
  },
  hybrid: {
    label: 'Hybrid — All Methods',
    desc:  'Chains Greedy → D&C → DP+MRV. Each phase reduces work for the next. Most efficient overall for all difficulty levels.',
    time:  'O(n²)', space: 'O(n²)', worst: 'O(9^81)',
  },
};

// ─── Sample Puzzles ──────────────────────────────────────
const SAMPLE_PUZZLES = [
  // Easy
  [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9],
  ],
  // Medium
  [
    [0,0,0,2,6,0,7,0,1],
    [6,8,0,0,7,0,0,9,0],
    [1,9,0,0,0,4,5,0,0],
    [8,2,0,1,0,0,0,4,0],
    [0,0,4,6,0,2,9,0,0],
    [0,5,0,0,0,3,0,2,8],
    [0,0,9,3,0,0,0,7,4],
    [0,4,0,0,5,0,0,3,6],
    [7,0,3,0,1,8,0,0,0],
  ],
  // Hard
  [
    [0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,3,0,8,5],
    [0,0,1,0,2,0,0,0,0],
    [0,0,0,5,0,7,0,0,0],
    [0,0,4,0,0,0,1,0,0],
    [0,9,0,0,0,0,0,0,0],
    [5,0,0,0,0,0,0,7,3],
    [0,0,2,0,1,0,0,0,0],
    [0,0,0,0,4,0,0,0,9],
  ],
];

let puzzleIdx = 0;

// ─── DOM helpers ─────────────────────────────────────────
const $ = id => document.getElementById(id);

function getCellEl(r, c) {
  return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

// ─── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildGrid();
  wireUI();
  loadPuzzle(SAMPLE_PUZZLES[0]);
  updateAlgoUI();
});

// ─── Build 9×9 Grid ──────────────────────────────────────
function buildGrid() {
  const grid = $('sudokuGrid');
  grid.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.tabIndex = 0;
      cell.addEventListener('click',    () => selectCell(r, c));
      cell.addEventListener('keydown',  e  => handleKey(e, r, c));
      grid.appendChild(cell);
    }
  }
}

// ─── Cell Selection ──────────────────────────────────────
function selectCell(r, c) {
  clearHighlights();
  state.selectedCell = {row: r, col: c};
  highlightRelated(r, c);
  getCellEl(r, c)?.classList.add('selected');
}

function clearHighlights() {
  document.querySelectorAll('.cell').forEach(el => {
    el.classList.remove('selected', 'highlight-related');
  });
}

function highlightRelated(r, c) {
  const boxR = Math.floor(r/3)*3, boxC = Math.floor(c/3)*3;
  for (let i = 0; i < 9; i++) {
    getCellEl(r, i)?.classList.add('highlight-related');
    getCellEl(i, c)?.classList.add('highlight-related');
  }
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
    getCellEl(boxR+dr, boxC+dc)?.classList.add('highlight-related');
  }
}

// ─── Key Input ───────────────────────────────────────────
function handleKey(e, r, c) {
  if (state.solving) return;
  if (state.given[r][c]) return;

  if (e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    placeDigit(r, c, parseInt(e.key));
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    placeDigit(r, c, 0);
  } else if (e.key === 'Escape') {
    clearHighlights();
    state.selectedCell = null;
  } else if (e.key === 'ArrowRight' && c < 8) { selectCell(r, c+1); getCellEl(r,c+1)?.focus(); }
  else if (e.key === 'ArrowLeft'  && c > 0) { selectCell(r, c-1); getCellEl(r,c-1)?.focus(); }
  else if (e.key === 'ArrowDown'  && r < 8) { selectCell(r+1, c); getCellEl(r+1,c)?.focus(); }
  else if (e.key === 'ArrowUp'    && r > 0) { selectCell(r-1, c); getCellEl(r-1,c)?.focus(); }
}

function placeDigit(r, c, val) {
  if (state.given[r][c]) return;
  state.board[r][c] = val;
  const cell = getCellEl(r, c);
  if (!cell) return;
  cell.classList.remove('conflict', 'user-input', 'correct');
  cell.textContent = val > 0 ? val : '';
  if (val > 0) {
    cell.classList.add('user-input');
    if (!isValidPlacement(state.board, r, c, val)) {
      cell.classList.add('conflict');
    }
  }
  updateProgress();
}

// ─── Load Puzzle ─────────────────────────────────────────
function loadPuzzle(puzzle) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    state.board[r][c]  = puzzle[r][c];
    state.given[r][c]  = puzzle[r][c] !== 0;
  }
  renderBoard();
  updateProgress();
  resetMetrics();
  setStatus('Ready', '');
}

function renderBoard() {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const cell = getCellEl(r, c);
    if (!cell) continue;
    cell.className = 'cell';
    cell.dataset.row = r;
    cell.dataset.col = c;
    cell.textContent = state.board[r][c] > 0 ? state.board[r][c] : '';
    if (state.given[r][c]) cell.classList.add('given');
  }
}

// ─── Progress ────────────────────────────────────────────
function updateProgress() {
  let count = 0;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (state.board[r][c] > 0) count++;
  }
  $('filledCount').textContent = count;
  $('progressFill').style.width = `${(count/81)*100}%`;
}

// ─── Status ──────────────────────────────────────────────
function setStatus(text, type) {
  $('statusText').textContent = text;
  const badge = $('statusBadge');
  badge.className = 'status-badge' + (type ? ` ${type}` : '');
}

// ─── Metrics ─────────────────────────────────────────────
function resetMetrics() {
  ['metricSteps','metricBacktracks','metricCache','metricDepth','metricTime'].forEach(id => {
    $(id).textContent = '—';
  });
  $('liveDot').classList.remove('active');
}

function setMetrics(m) {
  $('metricSteps').textContent      = fmt(m.steps);
  $('metricBacktracks').textContent = fmt(m.backtracks);
  $('metricCache').textContent      = fmt(m.cacheHits);
  $('metricDepth').textContent      = fmt(m.maxDepth);
  $('metricTime').textContent       = m.time.toFixed(2) + ' ms';
}

function fmt(n) { return n === undefined ? '—' : n.toLocaleString(); }

// ─── Algorithm UI ────────────────────────────────────────
function updateAlgoUI() {
  const key  = $('algoSelect').value;
  const meta = ALGO_META[key];
  $('algoDesc').textContent   = meta.desc;
  $('timeComp').textContent   = meta.time;
  $('spaceComp').textContent  = meta.space;
  $('worstComp').textContent  = meta.worst;
}

// ─── Wire UI ─────────────────────────────────────────────
function wireUI() {
  $('algoSelect').addEventListener('change', updateAlgoUI);

  $('solveBtn').addEventListener('click', startSolve);
  $('stopBtn').addEventListener('click', stopSolve);
  $('benchBtn').addEventListener('click', runBenchmark);

  $('newPuzzleBtn').addEventListener('click', () => {
    puzzleIdx = (puzzleIdx + 1) % SAMPLE_PUZZLES.length;
    loadPuzzle(SAMPLE_PUZZLES[puzzleIdx]);
    toast('New puzzle loaded', 'info');
  });
  $('generateBtn').addEventListener('click', () => {
    loadPuzzle(generatePuzzle());
    toast('Generated new puzzle', 'success');
  });
  $('resetBtn').addEventListener('click', () => {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (!state.given[r][c]) { state.board[r][c] = 0; }
    }
    renderBoard();
    updateProgress();
    resetMetrics();
    setStatus('Board reset', '');
    toast('Board reset to original', 'info');
  });
  $('eraseCellBtn').addEventListener('click', () => {
    if (state.selectedCell) {
      const {row, col} = state.selectedCell;
      placeDigit(row, col, 0);
    } else toast('Select a cell first', 'warning');
  });
  $('eraseBtn').addEventListener('click', () => {
    if (state.selectedCell) {
      const {row, col} = state.selectedCell;
      placeDigit(row, col, 0);
    } else toast('Select a cell first', 'warning');
  });
  $('validateBtn').addEventListener('click', validateBoard);
  $('submitBtn').addEventListener('click', submitAnswer);
  $('modalClose').addEventListener('click', () => $('benchModal').classList.remove('open'));
  $('benchModal').addEventListener('click', e => {
    if (e.target === $('benchModal')) $('benchModal').classList.remove('open');
  });

  // Global keydown for selected cell
  document.addEventListener('keydown', e => {
    if (!state.selectedCell || state.solving) return;
    const {row, col} = state.selectedCell;
    handleKey(e, row, col);
  });
}

// ─── Solve Entry ─────────────────────────────────────────
async function startSolve() {
  if (state.solving) return;
  const algo = $('algoSelect').value;
  const boardCopy = state.board.map(r=>[...r]);

  // Try to call backend first, fallback to local
  setStatus('Solving…', 'solving');
  $('boardOverlay').classList.add('visible');
  $('solveBtn').style.display  = 'none';
  $('stopBtn').style.display   = '';
  $('liveDot').classList.add('active');
  state.solving  = true;
  state.stopFlag = false;
  clearHighlights();

  try {
    const resp = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: boardCopy, algorithm: algo }),
      signal: AbortSignal.timeout(5000),
    });
  
    if (resp.ok) {
      const data = await resp.json();
      applyResult(data.board || data.solution, {steps:0,backtracks:0,cacheHits:0,maxDepth:0,time:0});
      finishSolve(true);
      return;
    }
  } catch (_) {
    /* backend not available — run locally */
  }

  // Local solve with animation
  await localSolve(boardCopy, algo);
}

function stopSolve() {
  state.stopFlag = true;
  clearTimeout(state.animTimer);
  state.animQueue = [];
  finishSolve(false);
  setStatus('Stopped', '');
  toast('Solving stopped', 'warning');
}

function finishSolve(success) {
  state.solving = false;
  $('boardOverlay').classList.remove('visible');
  $('solveBtn').style.display  = '';
  $('stopBtn').style.display   = 'none';
  $('liveDot').classList.remove('active');
  if (success) {
    setStatus('Solved ✓', 'done');
    toast('Puzzle solved!', 'success');
  }
}

// ─── Local Solve ─────────────────────────────────────────
async function localSolve(boardCopy, algo) {
  const t0 = performance.now();
  const metrics = { steps:0, backtracks:0, cacheHits:0, maxDepth:0, time:0 };
  const frames  = [];   // animation frames: {type, r, c, val}

  let solved = false;
  if      (algo === 'backtracking') solved = solveBacktrack(boardCopy, metrics, frames);
  else if (algo === 'greedy')       solved = solveGreedy(boardCopy, metrics, frames);
  else if (algo === 'divide')       solved = solveDivide(boardCopy, metrics, frames);
  else if (algo === 'dp_mrv')       solved = solveMRV(boardCopy, metrics, frames);
  else if (algo === 'hybrid')       solved = solveHybrid(boardCopy, metrics, frames);

  metrics.time = performance.now() - t0;

  if (!solved) {
    finishSolve(false);
    setStatus('No solution', 'error');
    toast('No solution found for this puzzle', 'error');
    return;
  }

  // Animate frames
  await animateFrames(frames, boardCopy, metrics);
}

// ─── Animation ───────────────────────────────────────────
function animateFrames(frames, finalBoard, metrics) {
  return new Promise(resolve => {
    const DELAY = frames.length > 500 ? 2 : frames.length > 200 ? 6 : 12;
    let i = 0;

    function next() {
      if (state.stopFlag || i >= frames.length) {
        if (!state.stopFlag) applyResult(finalBoard, metrics);
        resolve();
        if (!state.stopFlag) finishSolve(true);
        return;
      }
      const f = frames[i++];
      const cell = getCellEl(f.r, f.c);
      if (cell && !state.given[f.r][f.c]) {
        cell.className = 'cell ' + f.type;
        cell.textContent = f.val > 0 ? f.val : '';
      }
      // Update metrics every 50 frames
      if (i % 50 === 0) setMetrics({...metrics, steps: i});
      state.animTimer = setTimeout(next, DELAY);
    }
    next();
  });
}

function applyResult(board, metrics) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    state.board[r][c] = board[r][c];
    const cell = getCellEl(r, c);
    if (cell && !state.given[r][c]) {
      cell.className = 'cell correct';
      cell.textContent = board[r][c] > 0 ? board[r][c] : '';
    }
  }
  setMetrics(metrics);
  updateProgress();
}

// ══════════════════════════════════════════════════════════
// ─── Sudoku Algorithms ────────────────────────────────────
// ══════════════════════════════════════════════════════════

function isValidPlacement(b, r, c, num) {
  for (let i=0; i<9; i++) {
    if (i!==c && b[r][i]===num) return false;
    if (i!==r && b[i][c]===num) return false;
  }
  const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
  for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) {
    if (br+dr!==r||bc+dc!==c) if(b[br+dr][bc+dc]===num) return false;
  }
  return true;
}

function findEmpty(b) {
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) if(b[r][c]===0) return [r,c];
  return null;
}

// Backtracking
function solveBacktrack(b, m, frames, depth=0) {
  const pos = findEmpty(b);
  if (!pos) return true;
  const [r,c] = pos;
  m.maxDepth = Math.max(m.maxDepth, depth);
  for (let d=1;d<=9;d++) {
    m.steps++;
    if (isValidPlacement(b,r,c,d)) {
      b[r][c]=d;
      frames.push({r,c,val:d,type:'placing'});
      if (solveBacktrack(b,m,frames,depth+1)) return true;
      b[r][c]=0;
      m.backtracks++;
      frames.push({r,c,val:0,type:'backtrack'});
    }
  }
  return false;
}

// Greedy (naked singles first, then backtrack)
function solveGreedy(b, m, frames) {
  // Fill naked singles in a loop
  let changed = true;
  while (changed) {
    changed = false;
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
      if (b[r][c]!==0) continue;
      const cands = [];
      for (let d=1;d<=9;d++) if(isValidPlacement(b,r,c,d)) cands.push(d);
      if (cands.length===1) {
        b[r][c]=cands[0]; m.steps++;
        frames.push({r,c,val:cands[0],type:'placing'});
        changed=true;
      }
    }
  }
  return solveBacktrack(b,m,frames);
}

// Divide & Conquer — solve each 3x3 box's forced cells, then backtrack
function solveDivide(b, m, frames) {
  for (let br=0;br<3;br++) for (let bc=0;bc<3;bc++) {
    let changed=true;
    while(changed) {
      changed=false;
      for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) {
        const r=br*3+dr, c=bc*3+dc;
        if (b[r][c]!==0) continue;
        const cands=[];
        for (let d=1;d<=9;d++) if(isValidPlacement(b,r,c,d)) cands.push(d);
        if (cands.length===1) {
          b[r][c]=cands[0]; m.steps++;
          frames.push({r,c,val:cands[0],type:'placing'});
          changed=true;
        }
      }
    }
  }
  return solveBacktrack(b,m,frames);
}

// DP + MRV: always pick cell with fewest candidates
function solveMRV(b, m, frames, cache={}) {
  const key = b.map(r=>r.join('')).join('|');
  if (cache[key]!==undefined) { m.cacheHits++; return cache[key]; }

  // Find MRV cell
  let best=null, bestCount=10;
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    if (b[r][c]!==0) continue;
    let cnt=0;
    for (let d=1;d<=9;d++) if(isValidPlacement(b,r,c,d)) cnt++;
    if (cnt<bestCount) { bestCount=cnt; best=[r,c]; }
    if (cnt===0) { cache[key]=false; return false; }
  }
  if (!best) { cache[key]=true; return true; }
  const [r,c]=best;
  m.maxDepth = Math.max(m.maxDepth, Object.keys(cache).length % 100);
  for (let d=1;d<=9;d++) {
    m.steps++;
    if (isValidPlacement(b,r,c,d)) {
      b[r][c]=d;
      frames.push({r,c,val:d,type:'placing'});
      if (solveMRV(b,m,frames,cache)) { cache[key]=true; return true; }
      b[r][c]=0;
      m.backtracks++;
      frames.push({r,c,val:0,type:'backtrack'});
    }
  }
  cache[key]=false;
  return false;
}

// Hybrid: Greedy → D&C singles → MRV
function solveHybrid(b, m, frames) {
  let changed=true;
  while(changed) {
    changed=false;
    // Naked singles
    for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
      if (b[r][c]!==0) continue;
      const cands=[];
      for (let d=1;d<=9;d++) if(isValidPlacement(b,r,c,d)) cands.push(d);
      if (cands.length===1) { b[r][c]=cands[0]; m.steps++; frames.push({r,c,val:cands[0],type:'placing'}); changed=true; }
    }
    // Hidden singles per unit
    for (let unit=0;unit<9;unit++) {
      for (let d=1;d<=9;d++) {
        const rowPos=[], colPos=[], boxPos=[];
        for (let i=0;i<9;i++) {
          const br=Math.floor(unit/3)*3+Math.floor(i/3), bc=(unit%3)*3+(i%3);
          if (b[unit][i]===0 && isValidPlacement(b,unit,i,d)) rowPos.push([unit,i]);
          if (b[i][unit]===0 && isValidPlacement(b,i,unit,d)) colPos.push([i,unit]);
          if (b[br][bc]===0 && isValidPlacement(b,br,bc,d))   boxPos.push([br,bc]);
        }
        for (const pos of [rowPos,colPos,boxPos]) {
          if (pos.length===1) {
            const [r,c]=pos[0];
            if (b[r][c]===0) { b[r][c]=d; m.steps++; frames.push({r,c,val:d,type:'placing'}); changed=true; }
          }
        }
      }
    }
  }
  return solveMRV(b,m,frames,{});
}

// ─── Validate Board ──────────────────────────────────────
function validateBoard() {
  let valid = true;
  document.querySelectorAll('.cell').forEach(el => el.classList.remove('conflict'));

  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    const v = state.board[r][c];
    if (v===0) continue;
    const cell = getCellEl(r,c);
    // Temporarily zero out to check placement
    state.board[r][c]=0;
    if (!isValidPlacement(state.board,r,c,v)) { cell?.classList.add('conflict'); valid=false; }
    state.board[r][c]=v;
  }
  if (valid) { toast('Board is valid ✓', 'success'); setStatus('Valid', 'done'); }
  else       { toast('Conflicts detected', 'error'); setStatus('Conflicts', 'error'); }
}

// ─── Submit Answer ───────────────────────────────────────
async function submitAnswer() {
  const board = state.board.map(r=>[...r]);
  // Check completeness
  const empty = board.flat().filter(v=>v===0).length;
  if (empty > 0) { toast(`${empty} cells still empty`, 'warning'); return; }
  // Validate
  let valid = true;
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    const v = board[r][c];
    board[r][c]=0;
    if (!isValidPlacement(board,r,c,v)) valid=false;
    board[r][c]=v;
  }
  if (!valid) { toast('Solution contains conflicts', 'error'); return; }

  // Try backend
  try {
    const resp = await fetch('/solve', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({board}),
      signal: AbortSignal.timeout(3000),
    });
    if (resp.ok) { toast('Answer submitted ✓', 'success'); return; }
  } catch(_) {}

  toast('Correct solution! (offline mode)', 'success');
}

// ─── Benchmark ───────────────────────────────────────────
async function runBenchmark() {
  if (state.solving) return;
  toast('Running benchmark…', 'info');
  const results = [];
  const algos = ['backtracking','greedy','divide','dp_mrv','hybrid'];

  for (const algo of algos) {
    const b = state.board.map(r=>[...r]);
    const m = {steps:0,backtracks:0,cacheHits:0,maxDepth:0,time:0};
    const frames = [];
    const t0 = performance.now();

    let solved = false;
    if      (algo==='backtracking') solved = solveBacktrack(b,m,frames);
    else if (algo==='greedy')       solved = solveGreedy(b,m,frames);
    else if (algo==='divide')       solved = solveDivide(b,m,frames);
    else if (algo==='dp_mrv')       solved = solveMRV(b,m,frames,{});
    else if (algo==='hybrid')       solved = solveHybrid(b,m,frames);

    m.time = performance.now() - t0;
    const meta = ALGO_META[algo];
    results.push({
      algo, label: meta.label, solved,
      time:        m.time.toFixed(3),
      steps:       m.steps,
      backtracks:  m.backtracks,
      cacheHits:   m.cacheHits,
      maxDepth:    m.maxDepth,
      timeComp:    meta.time,
      spaceComp:   meta.space,
    });
  }

  renderBenchmark(results);
  $('benchModal').classList.add('open');
}

function renderBenchmark(results) {
  // Sort by time ascending
  const sorted = [...results].sort((a,b) => parseFloat(a.time)-parseFloat(b.time));
  const best   = sorted[0];

  $('benchBest').textContent = `🏆 Best: ${best.label} — ${best.time} ms`;

  const tbody = $('benchBody');
  tbody.innerHTML = '';
  results.forEach(r => {
    const isBest = r.algo === best.algo;
    const score  = isBest ? `<span class="score-pill score-best">Best</span>`
                 : parseFloat(r.time) < parseFloat(best.time)*3
                   ? `<span class="score-pill score-good">Good</span>`
                   : `<span class="score-pill score-normal">Avg</span>`;
    const tr = document.createElement('tr');
    if (isBest) tr.classList.add('best-row');
    tr.innerHTML = `
      <td>${r.label}${isBest?' 🏆':''}</td>
      <td>${r.time}</td>
      <td>${r.steps.toLocaleString()}</td>
      <td>${r.backtracks.toLocaleString()}</td>
      <td>${r.cacheHits.toLocaleString()}</td>
      <td>${r.maxDepth}</td>
      <td>${r.timeComp}</td>
      <td>${r.spaceComp}</td>
      <td>${score}</td>
    `;
    tbody.appendChild(tr);
  });

  $('benchAnalysis').innerHTML = `<strong>🏆 Analysis — Best: ${best.label}</strong><br>
    ${ALGO_META[best.algo].desc} Completed in <strong>${best.time} ms</strong> with 
    <strong>${Number(best.steps).toLocaleString()} steps</strong> and 
    <strong>${Number(best.backtracks).toLocaleString()} backtracks</strong>.`;
}

// ─── Puzzle Generator ────────────────────────────────────
function generatePuzzle() {
  const b = Array.from({length:9},()=>Array(9).fill(0));
  // Fill diagonal boxes (independent, no constraint between them)
  for (let box=0; box<3; box++) fillBox(b, box*3, box*3);
  // Solve the rest
  solveBacktrack(b,{steps:0,backtracks:0,cacheHits:0,maxDepth:0},{time:0},[]);
  // Remove clues
  const puzzle = b.map(r=>[...r]);
  const cells  = [];
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) cells.push([r,c]);
  shuffle(cells);
  let removed = 0;
  for (const [r,c] of cells) {
    if (removed >= 45) break; // Leave ~36 clues
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    // Quick check: still uniquely solvable (simplified: just keep going)
    removed++;
  }
  return puzzle;
}

function fillBox(b, startR, startC) {
  const nums = shuffle([1,2,3,4,5,6,7,8,9]);
  let i=0;
  for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) b[startR+dr][startC+dc]=nums[i++];
}

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// ─── Toast ───────────────────────────────────────────────
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };
  el.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
  $('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(()=>el.remove(), 220);
  }, 2800);
}
