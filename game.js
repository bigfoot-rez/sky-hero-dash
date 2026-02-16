const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// HUD elements
const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");
const playerNameText = document.getElementById("playerName");
const leaderboardEl = document.getElementById("leaderboard");

const resetButton = document.getElementById("resetButton");
const nameButton = document.getElementById("nameButton");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const startButton = document.getElementById("startButton");

const LS_NAME_KEY = "flappy_player_name_v1";
const LS_BOARD_KEY = "flappy_leaderboard_v1"; // per device leaderboard

// Game state
let bird, pipes, score, best, gameOver, started;
let animationId;
let pipeSpawnTimer = 0;

// Physics / difficulty
const GRAVITY = 0.6;
const LIFT = -10;
const PIPE_SPEED = 2.5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160;
const PIPE_SPAWN_EVERY = 90; // frames at ~60fps

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function getPlayerName() {
  return localStorage.getItem(LS_NAME_KEY) || "";
}

function setPlayerName(name) {
  const cleaned = (name || "").trim().slice(0, 16);
  if (!cleaned) return false;
  localStorage.setItem(LS_NAME_KEY, cleaned);
  playerNameText.textContent = cleaned;
  return true;
}

function promptForName() {
  const current = getPlayerName();
  const name = prompt("Pick a nickname (max 16 chars):", current || "");
  if (name === null) return; // user cancelled
  if (!setPlayerName(name)) alert("Nickname can’t be empty.");
  renderLeaderboard();
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LS_BOARD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // sanitize
    return parsed
      .filter(x => x && typeof x.name === "string" && typeof x.score === "number")
      .map(x => ({ name: x.name.slice(0, 16), score: Math.max(0, Math.floor(x.score)) }))
      .slice(0, 50);
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LS_BOARD_KEY, JSON.stringify(entries));
}

function submitScoreToLeaderboard(finalScore) {
  const name = getPlayerName() || "Player";
  let board = loadLeaderboard();

  board.push({ name, score: finalScore });
  board.sort((a, b) => b.score - a.score);

  // keep top 5
  board = board.slice(0, 5);
  saveLeaderboard(board);
  renderLeaderboard();
}

function renderLeaderboard() {
  const board = loadLeaderboard().slice(0, 5);
  leaderboardEl.innerHTML = "";
  if (board.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No scores yet — be the first!";
    leaderboardEl.appendChild(li);
    return;
  }
  for (const entry of board) {
    const li = document.createElement("li");
    li.textContent = `${entry.name}: ${entry.score}`;
    leaderboardEl.appendChild(li);
  }
}

function initGame() {
  bird = {
    x: 70,
    y: canvas.height * 0.5,
    w: 30,
    h: 30,
    vy: 0,
  };

  pipes = [];
  score = 0;
  best = Math.max(0, Number(localStorage.getItem("flappy_best_v1") || "0"));
  gameOver = false;
  started = false;
  pipeSpawnTimer = 0;

  scoreText.textContent = "0";
  bestText.textContent = String(best);

  showOverlay("Tap to start");
}

function showOverlay(title) {
  overlayTitle.textContent = title;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function flap() {
  if (gameOver) return;

  if (!started) {
    started = true;
    hideOverlay();
  }
  bird.vy = LIFT;
}

function reset() {
  if (animationId) cancelAnimationFrame(animationId);
  initGame();
  animationId = requestAnimationFrame(loop);
}

function spawnPipe() {
  const margin = 60;
  const topMin = margin;
  const topMax = canvas.height - margin - PIPE_GAP;
  const top = Math.floor(topMin + Math.random() * (topMax - topMin));

  pipes.push({
    x: canvas.width + 10,
    top,
    passed: false,
  });
}

function update() {
  if (!started || gameOver) return;

  // bird
  bird.vy += GRAVITY;
  bird.y += bird.vy;

  // bounds
  if (bird.y + bird.h > canvas.height) {
    bird.y = canvas.height - bird.h;
    endGame();
    return;
  }
  if (bird.y < 0) {
    bird.y = 0;
    endGame();
    return;
  }

  // pipes
  pipeSpawnTimer++;
  if (pipeSpawnTimer >= PIPE_SPAWN_EVERY) {
    pipeSpawnTimer = 0;
    spawnPipe();
  }

  for (const p of pipes) {
    p.x -= PIPE_SPEED;

    const pipeRight = p.x + PIPE_WIDTH;
    const birdRight = bird.x + bird.w;
    const birdBottom = bird.y + bird.h;
    const gapBottom = p.top + PIPE_GAP;

    // collision
    const xOverlap = birdRight > p.x && bird.x < pipeRight;
    if (xOverlap) {
      const hitTop = bird.y < p.top;
      const hitBottom = birdBottom > gapBottom;
      if (hitTop || hitBottom) {
        endGame();
        return;
      }
    }

    // score when passing pipe (once)
    if (!p.passed && pipeRight < bird.x) {
      p.passed = true;
      score++;
      scoreText.textContent = String(score);
    }
  }

  // remove offscreen
  pipes = pipes.filter(p => p.x + PIPE_WIDTH > -20);
}

function draw() {
  // background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // bird
  ctx.fillStyle = "yellow";
  ctx.fillRect(bird.x, bird.y, bird.w, bird.h);

  // pipes
  ctx.fillStyle = "green";
  for (const p of pipes) {
    // top pipe
    ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
    // bottom pipe
    const gapBottom = p.top + PIPE_GAP;
    ctx.fillRect(p.x, gapBottom, PIPE_WIDTH, canvas.height - gapBottom);
  }

  // game over text
  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "36px Arial";
    ctx.fillText("Game Over", 95, 290);
    ctx.font = "16px Arial";
    ctx.fillStyle = "black";
    ctx.fillText("Press Reset or Tap to Restart", 85, 320);
  }
}

function endGame() {
  if (gameOver) return;
  gameOver = true;

  // best score persistent
  if (score > best) {
    best = score;
    localStorage.setItem("flappy_best_v1", String(best));
    bestText.textContent = String(best);
  }

  submitScoreToLeaderboard(score);
  showOverlay("Game Over");
}

function loop() {
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

/* --- Input handling (and stop mobile double-tap zoom) --- */

// Prevent double-tap zoom / gesture behaviors
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

// Use pointer events for best cross-device behavior
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  // If game over, allow tap to restart quickly
  if (gameOver) {
    reset();
    return;
  }
  flap();
}, { passive: false });

// Spacebar flap
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (gameOver) reset();
    else flap();
  }
});

// Buttons
resetButton.addEventListener("click", () => reset());
nameButton.addEventListener("click", () => promptForName());
startButton.addEventListener("click", () => {
  if (gameOver) reset();
  else flap();
});

// Init player name + leaderboard
(function boot() {
  const existing = getPlayerName();
  if (existing) playerNameText.textContent = existing;
  else {
    // first-time: prompt
    promptForName();
  }
  renderLeaderboard();
  initGame();
  loop();
})();
