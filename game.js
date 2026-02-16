const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 600;

let bird, pipes, frame, score, gameOver, highScore;
let animationId; // track requestAnimationFrame

// Initialize game state
function initGame() {
  bird = {
    x: 50,
    y: 300,
    width: 30,
    height: 30,
    gravity: 0.6,
    lift: -10,
    velocity: 0
  };
  pipes = [];
  frame = 0;
  score = 0;
  gameOver = false;

  document.getElementById("currentScore").textContent = "Score: 0";
}

highScore = 0;
initGame();

// Draw bird
function drawBird() {
  ctx.fillStyle = "yellow";
  ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
}

// Draw pipes
function drawPipes() {
  ctx.fillStyle = "green";
  pipes.forEach(pipe => {
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
    ctx.fillRect(pipe.x, pipe.bottom, pipe.width, canvas.height);
  });
}

// Update pipes
function updatePipes() {
  if (frame % 90 === 0) {
    let top = Math.random() * 250 + 50;
    let gap = 150;
    pipes.push({
      x: canvas.width,
      width: 50,
      top: top,
      bottom: top + gap
    });
  }

  pipes.forEach(pipe => {
    pipe.x -= 2;
    if (
      bird.x < pipe.x + pipe.width &&
      bird.x + bird.width > pipe.x &&
      (bird.y < pipe.top || bird.y + bird.height > pipe.bottom)
    ) {
      gameOver = true;
    }
  });

  pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);
}

// Update bird
function updateBird() {
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;

  if (bird.y + bird.height > canvas.height || bird.y < 0) {
    gameOver = true;
  }
}

// Draw scores
function drawScore() {
  document.getElementById("currentScore").textContent = "Score: " + score;
  document.getElementById("highScore").textContent = "High Score: " + highScore;
}

// Main game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateBird();
  updatePipes();
  drawBird();
  drawPipes();

  if (!gameOver && frame % 90 === 0) score++;

  if (score > highScore) highScore = score;

  drawScore();

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "36px Arial";
    ctx.fillText("Game Over", 100, 300);
  } else {
    frame++;
    animationId = requestAnimationFrame(gameLoop);
  }
}

// Jump on key or touch
document.addEventListener("keydown", () => {
  bird.velocity += bird.lift;
});
document.addEventListener("touchstart", () => {
  bird.velocity += bird.lift;
});

// Reset button
document.getElementById("resetButton").addEventListener("click", () => {
  if (animationId) cancelAnimationFrame(animationId); // cancel old loop
  initGame();
  gameLoop();
});

// Start game
gameLoop();
