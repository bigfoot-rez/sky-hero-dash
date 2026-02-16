const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// HUD
const scoreText = document.getElementById("scoreText");
const bestText = document.getElementById("bestText");
const playerNameText = document.getElementById("playerName");
const leaderboardEl = document.getElementById("leaderboard");

const resetButton = document.getElementById("resetButton");
const nameButton = document.getElementById("nameButton");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const startButton = document.getElementById("startButton");

// LocalStorage keys (per device)
const LS_NAME_KEY = "skyhero_player_name_v1";
const LS_BOARD_KEY = "skyhero_leaderboard_v1";
const LS_BEST_KEY = "skyhero_best_v1";

// Game state
let hero, buildings, score, best, gameOver, started;
let animationId;
let frame = 0;

// Tuning
const GRAVITY = 0.55;
const LIFT = -10.0;
const BUILDING_SPEED = 2.6;
const BUILDING_WIDTH = 64;
const GAP_SIZE = 170;
const SPAWN_EVERY_FRAMES = 90; // ~1.5s at 60fps

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
  if (name === null) return; // cancelled
  if (!setPlayerName(name)) alert("Nickname can’t be empty.");
  renderLeaderboard();
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LS_BOARD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(x => x && typeof x.name === "string" && typeof x.score === "number")
      .map(x => ({ name: x.name.slice(0, 16), score: Math.max(0, Math.floor(x.score)) }));
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LS_BOARD_KEY, JSON.stringify(entries));
}

function submitScore(scoreValue) {
  const name = getPlayerName() || "Player";
  let board = loadLeaderboard();
  board.push({ name, score: scoreValue });
  board.sort((a, b) => b.score - a.score);
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

function showOverlay(title) {
  overlayTitle.textContent = title;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function initGame() {
  hero = {
    x: 80,
    y: canvas.height * 0.5,
    w: 34,
    h: 34,
    vy: 0
  };

  buildings = [];
  score = 0;
  best = Math.max(0, Number(localStorage.getItem(LS_BEST_KEY) || "0"));
  gameOver = false;
  started = false;
  frame = 0;

  scoreText.textContent = "0";
  bestText.textContent = String(best);

  showOverlay("Tap to start");
}

function reset() {
  if (animationId) cancelAnimationFrame(animationId);
  initGame();
  animationId = requestAnimationFrame(loop);
}

function flap() {
  if (gameOver) return;

  if (!started) {
    started = true;
    hideOverlay();
  }
  hero.vy = LIFT;
}

function spawnBuildingPair() {
  const margin = 70;
  const topMin = margin;
  const topMax = canvas.height - margin - GAP_SIZE;
  const top = Math.floor(topMin + Math.random() * (topMax - topMin));

  buildings.push({
    x: canvas.width + 10,
    top,
    passed: false
  });
}

function endGame() {
  if (gameOver) return;
  gameOver = true;

  if (score > best) {
    best = score;
    localStorage.setItem(LS_BEST_KEY, String(best));
    bestText.textContent = String(best);
  }

  submitScore(score);
  showOverlay("Game Over");
}

/* ---------- Drawing (upgraded graphics) ---------- */

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#87CEEB");
  sky.addColorStop(1, "#cdeffd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // subtle clouds
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 5; i++) {
    const cx = (i * 120 + (frame * 0.4)) % (canvas.width + 140) - 70;
    const cy = 80 + (i % 3) * 40;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy + 6, 18, 0, Math.PI * 2);
    ctx.arc(cx - 22, cy + 8, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHero(x, y) {
  // shadow
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x + 18, y + 40, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // cape (animated a bit using frame)
  const flutter = Math.sin(frame * 0.2) * 4;
  ctx.fillStyle = "#d10000";
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 16);
  ctx.lineTo(x - 18, y + 22 + flutter);
  ctx.lineTo(x + 2, y + 34);
  ctx.closePath();
  ctx.fill();

  // body suit
  ctx.fillStyle = "#1f4bff";
  ctx.fillRect(x, y + 10, 34, 24);

  // belt
  ctx.fillStyle = "#ffd400";
  ctx.fillRect(x + 6, y + 26, 22, 4);

  // head
  ctx.fillStyle = "#ffcc99";
  ctx.beginPath();
  ctx.arc(x + 17, y + 6, 10, 0, Math.PI * 2);
  ctx.fill();

  // mask
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 7, y + 2, 20, 6);

  // eye slits
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 10, y + 4, 6, 2);
  ctx.fillRect(x + 19, y + 4, 6, 2);

  // emblem
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + 17, y + 20, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuilding(x, y, width, height) {
  // base building
  ctx.fillStyle = "#7a0a0a";
  ctx.fillRect(x, y, width, height);

  // darker side shading
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.fillRect(x + width - 10, y, 10, height);
  ctx.globalAlpha = 1;

  // brick lines
  ctx.strokeStyle = "#4e0707";
  ctx.lineWidth = 1;

  for (let row = y; row < y + height; row += 14) {
    ctx.beginPath();
    ctx.moveTo(x, row);
    ctx.lineTo(x + width, row);
    ctx.stroke();
  }

  // staggered vertical brick seams
  for (let row = 0; row < height; row += 28) {
    const offset = (row / 28) % 2 === 0 ? 0 : 10;
    for (let col = x + offset; col < x + width; col += 20) {
      ctx.beginPath();
      ctx.moveTo(col, y + row);
      ctx.lineTo(col, y + row + 14);
      ctx.stroke();
    }
  }

  // windows
  ctx.fillStyle = "rgba(255, 234, 120, 0.9)";
  for (let wy = y + 10; wy < y + height - 10; wy += 46) {
    for (let wx = x + 10; wx < x + width - 12; wx += 22) {
      ctx.fillRect(wx, wy, 8, 12);
    }
  }
}

/* ---------- Game update / draw loop ---------- */

function update() {
  if (!started || gameOver) return;

  // physics
  hero.vy += GRAVITY;
  hero.y += hero.vy;

  // boundaries
  if (hero.y + hero.h > canvas.height) {
    hero.y = canvas.height - hero.h;
    endGame();
    return;
  }
  if (hero.y < 0) {
    hero.y = 0;
    endGame();
    return;
  }

  // spawn
  if (frame % SPAWN_EVERY_FRAMES === 0) {
    spawnBuildingPair();
  }

  // move + collide + score
  for (const b of buildings) {
    b.x -= BUILDING_SPEED;

    const gapTop = b.top;
    const gapBottom = b.top + GAP_SIZE;
    const right = b.x + BUILDING_WIDTH;

    const heroRight = hero.x + hero.w;
    const heroBottom = hero.y + hero.h;

    const xOverlap = heroRight > b.x && hero.x < right;
    if (xOverlap) {
      const hitTop = hero.y < gapTop;
      const hitBottom = heroBottom > gapBottom;
      if (hitTop || hitBottom) {
        endGame();
        return;
      }
    }

    // score when you pass the building pair
    if (!b.passed && right < hero.x) {
      b.passed = true;
      score++;
      scoreText.textContent = String(score);
    }
  }

  // cleanup offscreen
  buildings = buildings.filter(b => b.x + BUILDING_WIDTH > -40);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawSky();

  // buildings (top + bottom)
  for (const b of buildings) {
    drawBuilding(b.x, 0, BUILDING_WIDTH, b.top);
    const gapBottom = b.top + GAP_SIZE;
    drawBuilding(b.x, gapBottom, BUILDING_WIDTH, canvas.height - gapBottom);
  }

  drawHero(hero.x, hero.y);

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.font = "34px Arial";
    ctx.fillText("Game Over", 98, 290);
    ctx.font = "14px Arial";
    ctx.fillText("Tap Reset (or tap canvas) to restart", 78, 320);
  }
}

function loop() {
  frame++;
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

/* ---------- Input / mobile fixes ---------- */

// prevent double-click zoom behaviors
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

// pointer controls (best for mobile + desktop)
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (gameOver) reset();
  else flap();
}, { passive: false });

// spacebar
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (gameOver) reset();
    else flap();
  }
});

// buttons
resetButton.addEventListener("click", () => reset());
nameButton.addEventListener("click", () => promptForName());
startButton.addEventListener("click", () => {
  if (gameOver) reset();
  else flap();
});

/* ---------- Boot ---------- */
(function boot() {
  const existing = getPlayerName();
  if (existing) playerNameText.textContent = existing;
  else promptForName();

  renderLeaderboard();
  initGame();
  loop();
})();
