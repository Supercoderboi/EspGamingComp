// =============================================================================
// GameOS Tetris (GameScript 1.0)
// =============================================================================

// --- Board & Layout Constants ---
const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const BLOCK_SIZE = 20;

// Center 10x20 board on 640x480 resolution (200x400 px playfield)
const BOARD_X = 220;
const BOARD_Y = 40;

// Color Palette Constants
const COLOR_BLACK   = BLACK;
const COLOR_WHITE   = WHITE;
const COLOR_CYAN    = CYAN;
const COLOR_BLUE    = BLUE;
const COLOR_ORANGE  = ORANGE;
const COLOR_YELLOW  = YELLOW;
const COLOR_GREEN   = GREEN;
const COLOR_MAGENTA = MAGENTA;
const COLOR_RED     = RED;
const COLOR_GRAY    = GRAY;

// Tetromino Definitions: [I, J, L, O, S, T, Z]
// Each piece contains 4 rotation states represented as 4x4 or 3x3 grids encoded in 1D array of length 16.
const PIECE_COLORS = [
  COLOR_CYAN,    // 1: I
  COLOR_BLUE,    // 2: J
  COLOR_ORANGE,  // 3: L
  COLOR_YELLOW,  // 4: O
  COLOR_GREEN,   // 5: S
  COLOR_MAGENTA, // 6: T
  COLOR_RED      // 7: Z
];

const PIECE_SHAPES = [
  // 1: I
  [
    [0,0,0,0, 1,1,1,1, 0,0,0,0, 0,0,0,0],
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    [0,0,0,0, 0,0,0,0, 1,1,1,1, 0,0,0,0],
    [0,1,0,0, 0,1,0,0, 0,1,0,0, 0,1,0,0]
  ],
  // 2: J
  [
    [1,0,0, 1,1,1, 0,0,0],
    [0,1,1, 0,1,0, 0,1,0],
    [0,0,0, 1,1,1, 0,0,1],
    [0,1,0, 0,1,0, 1,1,0]
  ],
  // 3: L
  [
    [0,0,1, 1,1,1, 0,0,0],
    [0,1,0, 0,1,0, 0,1,1],
    [0,0,0, 1,1,1, 1,0,0],
    [1,1,0, 0,1,0, 0,1,0]
  ],
  // 4: O
  [
    [1,1, 1,1],
    [1,1, 1,1],
    [1,1, 1,1],
    [1,1, 1,1]
  ],
  // 5: S
  [
    [0,1,1, 1,1,0, 0,0,0],
    [0,1,0, 0,1,1, 0,0,1],
    [0,0,0, 0,1,1, 1,1,0],
    [1,0,0, 1,1,0, 0,1,0]
  ],
  // 6: T
  [
    [0,1,0, 1,1,1, 0,0,0],
    [0,1,0, 0,1,1, 0,1,0],
    [0,0,0, 1,1,1, 0,1,0],
    [0,1,0, 1,1,0, 0,1,0]
  ],
  // 7: Z
  [
    [1,1,0, 0,1,1, 0,0,0],
    [0,0,1, 0,1,1, 0,1,0],
    [0,0,0, 1,1,0, 0,1,1],
    [0,1,0, 1,1,0, 1,0,0]
  ]
];

// --- Game State Globals ---
let board = [];
let score = 0;
let linesCleared = 0;
let level = 1;
let gameOver = false;
let isPaused = false;

// Active & Next Piece States
let currentPiece = null;
let nextPieceId = 0;
let dropTimer = 0.0;
let dropInterval = 0.8; // Decreases as level increases

// Input Autorepeat Timers
let dasLeftTimer = 0.0;
let dasRightTimer = 0.0;
let dasDownTimer = 0.0;
const DAS_DELAY = 0.15;
const ARR_RATE = 0.04;

// --- Helper & Utility Functions ---

function getPieceDim(typeId) {
  if (typeId === 1) return 4;
  if (typeId === 4) return 2;
  return 3;
}

function createPiece(typeId) {
  let dim = getPieceDim(typeId);
  return {
    type: typeId,
    rot: 0,
    dim: dim,
    x: Math.floor((BOARD_COLS - dim) / 2),
    y: 0
  };
}

function getRandomPieceId() {
  return Math.floor(random(1, 8));
}

function getCell(p, r, c) {
  let shapes = PIECE_SHAPES[p.type - 1];
  let matrix = shapes[p.rot];
  return matrix[r * p.dim + c];
}

// --- Collision Detection ---

function checkCollision(piece, offsetX, offsetY, rotation) {
  let testRot = rotation;
  if (testRot === undefined) testRot = piece.rot;
  
  let targetX = piece.x + offsetX;
  let targetY = piece.y + offsetY;
  let dim = piece.dim;
  let matrix = PIECE_SHAPES[piece.type - 1][testRot];

  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (matrix[r * dim + c] !== 0) {
        let cellX = targetX + c;
        let cellY = targetY + r;

        // Wall and floor checks
        if (cellX < 0 || cellX >= BOARD_COLS || cellY >= BOARD_ROWS) {
          return true;
        }
        // Occupied cell check (if inside upper board boundary)
        if (cellY >= 0 && board[cellY * BOARD_COLS + cellX] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// --- Game Logic ---

function resetGame() {
  board = [];
  for (let i = 0; i < BOARD_ROWS * BOARD_COLS; i++) {
    board.push(0);
  }
  score = 0;
  linesCleared = 0;
  level = 1;
  dropInterval = 0.8;
  gameOver = false;
  isPaused = false;
  
  nextPieceId = getRandomPieceId();
  spawnPiece();
}

function spawnPiece() {
  currentPiece = createPiece(nextPieceId);
  nextPieceId = getRandomPieceId();
  dropTimer = 0.0;

  // Game over check if spawned piece collides immediately
  if (checkCollision(currentPiece, 0, 0)) {
    gameOver = true;
  }
}

function lockPiece() {
  let dim = currentPiece.dim;
  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (getCell(currentPiece, r, c) !== 0) {
        let bx = currentPiece.x + c;
        let by = currentPiece.y + r;
        if (by >= 0 && by < BOARD_ROWS && bx >= 0 && bx < BOARD_COLS) {
          board[by * BOARD_COLS + bx] = currentPiece.type;
        }
      }
    }
  }
  clearFullLines();
  spawnPiece();
}

function clearFullLines() {
  let linesToClear = 0;

  for (let r = BOARD_ROWS - 1; r >= 0; r--) {
    let full = true;
    for (let c = 0; c < BOARD_COLS; c++) {
      if (board[r * BOARD_COLS + c] === 0) {
        full = false;
        break;
      }
    }

    if (full) {
      linesToClear++;
      // Shift all rows above down by one
      for (let y = r; y > 0; y--) {
        for (let x = 0; x < BOARD_COLS; x++) {
          board[y * BOARD_COLS + x] = board[(y - 1) * BOARD_COLS + x];
        }
      }
      // Clear top row
      for (let x = 0; x < BOARD_COLS; x++) {
        board[0 * BOARD_COLS + x] = 0;
      }
      r++; // Re-check current row index after shift
    }
  }

  if (linesToClear > 0) {
    linesCleared += linesToClear;
    // Classic scoring system
    let linePoints = [0, 100, 300, 500, 800];
    score += linePoints[linesToClear] * level;

    // Dynamic level scaling
    level = Math.floor(linesCleared / 10) + 1;
    dropInterval = Math.max(0.05, 0.8 - (level - 1) * 0.07);
  }
}

function rotatePiece(direction) {
  let oldRot = currentPiece.rot;
  let newRot = (oldRot + direction + 4) % 4;
  
  // Basic rotation check
  if (!checkCollision(currentPiece, 0, 0, newRot)) {
    currentPiece.rot = newRot;
    return;
  }

  // SRS Wall Kicks (Basic offset checks: left 1, right 1, up 1)
  const kicks = [-1, 1, -2, 2];
  for (let i = 0; i < kicks.length; i++) {
    let kx = kicks[i];
    if (!checkCollision(currentPiece, kx, 0, newRot)) {
      currentPiece.x += kx;
      currentPiece.rot = newRot;
      return;
    }
  }
}

function hardDrop() {
  let dropDistance = 0;
  while (!checkCollision(currentPiece, 0, dropDistance + 1)) {
    dropDistance++;
  }
  currentPiece.y += dropDistance;
  score += dropDistance * 2;
  lockPiece();
}

function getGhostY() {
  let ghostY = currentPiece.y;
  while (!checkCollision(currentPiece, 0, (ghostY - currentPiece.y) + 1)) {
    ghostY++;
  }
  return ghostY;
}

// --- Lifecycle Functions ---

function init() {
  log("GameOS Tetris initializing...");
  resetGame();
}

function update() {
  let dt = deltaTime();

  // Handle Pause and Start/Restart
  if (btnPressed("START")) {
    if (gameOver) {
      resetGame();
    } else {
      isPaused = !isPaused;
    }
    return;
  }

  if (gameOver || isPaused) return;

  // Rotation Controls (A = Clockwise, B = Counter-Clockwise)
  if (btnPressed("A") || btnPressed("UP")) {
    rotatePiece(1);
  } else if (btnPressed("B")) {
    rotatePiece(-1);
  }

  // Hard Drop (Y Button)
  if (btnPressed("Y")) {
    hardDrop();
    return;
  }

  // Left Motion & Autorepeat (DAS)
  if (btnDown("LEFT")) {
    if (btnPressed("LEFT")) {
      if (!checkCollision(currentPiece, -1, 0)) currentPiece.x -= 1;
      dasLeftTimer = DAS_DELAY;
    } else {
      dasLeftTimer -= dt;
      if (dasLeftTimer <= 0) {
        if (!checkCollision(currentPiece, -1, 0)) currentPiece.x -= 1;
        dasLeftTimer = ARR_RATE;
      }
    }
  }

  // Right Motion & Autorepeat (DAS)
  if (btnDown("RIGHT")) {
    if (btnPressed("RIGHT")) {
      if (!checkCollision(currentPiece, 1, 0)) currentPiece.x += 1;
      dasRightTimer = DAS_DELAY;
    } else {
      dasRightTimer -= dt;
      if (dasRightTimer <= 0) {
        if (!checkCollision(currentPiece, 1, 0)) currentPiece.x += 1;
        dasRightTimer = ARR_RATE;
      }
    }
  }

  // Soft Drop & Autorepeat
  if (btnDown("DOWN")) {
    dasDownTimer -= dt;
    if (dasDownTimer <= 0) {
      if (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y += 1;
        score += 1;
      }
      dasDownTimer = ARR_RATE;
    }
  } else {
    dasDownTimer = 0;
  }

  // Automatic Gravity Fall
  dropTimer += dt;
  if (dropTimer >= dropInterval) {
    dropTimer = 0.0;
    if (!checkCollision(currentPiece, 0, 1)) {
      currentPiece.y += 1;
    } else {
      lockPiece();
    }
  }
}

function draw() {
  clear(COLOR_BLACK);

  // 1. Draw Outer Frame & Playfield
  drawRect(BOARD_X - 2, BOARD_Y - 2, (BOARD_COLS * BLOCK_SIZE) + 4, (BOARD_ROWS * BLOCK_SIZE) + 4, COLOR_WHITE);

  // 2. Draw Locked Grid Blocks
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      let cellType = board[r * BOARD_COLS + c];
      if (cellType !== 0) {
        let px = BOARD_X + c * BLOCK_SIZE;
        let py = BOARD_Y + r * BLOCK_SIZE;
        fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, PIECE_COLORS[cellType - 1]);
      }
    }
  }

  if (!gameOver) {
    // 3. Draw Ghost Piece
    let ghostY = getGhostY();
    let dim = currentPiece.dim;
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        if (getCell(currentPiece, r, c) !== 0) {
          let gx = BOARD_X + (currentPiece.x + c) * BLOCK_SIZE;
          let gy = BOARD_Y + (ghostY + r) * BLOCK_SIZE;
          drawRect(gx + 1, gy + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, COLOR_GRAY);
        }
      }
    }

    // 4. Draw Active Piece
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        if (getCell(currentPiece, r, c) !== 0) {
          let px = BOARD_X + (currentPiece.x + c) * BLOCK_SIZE;
          let py = BOARD_Y + (currentPiece.y + r) * BLOCK_SIZE;
          fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, PIECE_COLORS[currentPiece.type - 1]);
        }
      }
    }
  }

  // 5. Draw UI Sidebar (Score, Level, Lines, Next Preview)
  let uiX = BOARD_X + (BOARD_COLS * BLOCK_SIZE) + 30;
  drawTextSize("TETRIS", uiX, BOARD_Y, COLOR_YELLOW, 3);

  drawTextSize("SCORE", uiX, BOARD_Y + 60, COLOR_WHITE, 1);
  drawTextSize(toString(score), uiX, BOARD_Y + 75, COLOR_GREEN, 2);

  drawTextSize("LEVEL", uiX, BOARD_Y + 110, COLOR_WHITE, 1);
  drawTextSize(toString(level), uiX, BOARD_Y + 125, COLOR_CYAN, 2);

  drawTextSize("LINES", uiX, BOARD_Y + 160, COLOR_WHITE, 1);
  drawTextSize(toString(linesCleared), uiX, BOARD_Y + 175, COLOR_MAGENTA, 2);

  // Next Piece Box
  drawTextSize("NEXT", uiX, BOARD_Y + 220, COLOR_WHITE, 1);
  drawRect(uiX, BOARD_Y + 235, 100, 80, COLOR_WHITE);
  
  if (nextPieceId > 0) {
    let dummyNext = createPiece(nextPieceId);
    let nextDim = dummyNext.dim;
    for (let r = 0; r < nextDim; r++) {
      for (let c = 0; c < nextDim; c++) {
        if (getCell(dummyNext, r, c) !== 0) {
          let nx = uiX + 10 + c * 18;
          let ny = BOARD_Y + 245 + r * 18;
          fillRect(nx, ny, 16, 16, PIECE_COLORS[nextPieceId - 1]);
        }
      }
    }
  }

  // 6. Draw Game Status Overlays
  if (isPaused) {
    drawTextSize("PAUSED", BOARD_X + 45, BOARD_Y + 180, COLOR_YELLOW, 3);
  } else if (gameOver) {
    drawTextSize("GAME OVER", BOARD_X + 20, BOARD_Y + 170, COLOR_RED, 3);
    drawTextSize("Press START to Restart", BOARD_X + 10, BOARD_Y + 210, COLOR_WHITE, 1);
  }
}
