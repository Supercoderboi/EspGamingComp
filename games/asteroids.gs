// @name: Asteroids
// @id: asteroids
// @description: Classic asteroids game.
// @engine: GameScript
// @version: 1.0.0

// ASTEROIDS — GameScript API 1.0
// Controls: LEFT/RIGHT rotate, UP thrust, A fire, START restart.
// Angles use radians. Controller button names are string values.

const ROCK_CAP = 24;
const SHOT_CAP = 8;
const TAU = 6.28318530718;

let ship;
let rocks;
let shots;
let score;
let lives;
let fireWait;
let gameOver;

function init() {
  score = 0;
  lives = 3;
  fireWait = 0;
  gameOver = false;

  ship = {
    x: gameWidth() / 2,
    y: gameHeight() / 2,
    vx: 0,
    vy: 0,
    angle: -1.57079632679,
    invulnerable: 2
  };

  rocks = [];
  shots = [];
  for (let i = 0; i < ROCK_CAP; i += 1) {
    rocks.push({ x: 0, y: 0, vx: 0, vy: 0, radius: 0, active: false });
  }
  for (let j = 0; j < SHOT_CAP; j += 1) {
    shots.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false });
  }

  for (let k = 0; k < 7; k += 1) {
    spawnRock(24 + random(10));
  }
}

function spawnRock(radius) {
  for (let i = 0; i < ROCK_CAP; i += 1) {
    if (!rocks[i].active) {
      let x = random(gameWidth());
      let y = random(gameHeight());
      // Keep the opening rocks away from the ship.
      if (score === 0 && lives === 3 && circleOverlap(x, y, 0, gameWidth() / 2, gameHeight() / 2, 110)) {
        x = (x + gameWidth() / 2) % gameWidth();
        y = (y + gameHeight() / 2) % gameHeight();
      }
      let direction = random(TAU);
      let speed = 18 + random(32);
      rocks[i].x = x;
      rocks[i].y = y;
      rocks[i].vx = cos(direction) * speed;
      rocks[i].vy = sin(direction) * speed;
      rocks[i].radius = radius;
      rocks[i].active = true;
      return;
    }
  }
}

function fireShot() {
  for (let i = 0; i < SHOT_CAP; i += 1) {
    if (!shots[i].active) {
      let noseX = ship.x + cos(ship.angle) * 15;
      let noseY = ship.y + sin(ship.angle) * 15;
      shots[i].x = noseX;
      shots[i].y = noseY;
      shots[i].vx = ship.vx + cos(ship.angle) * 250;
      shots[i].vy = ship.vy + sin(ship.angle) * 250;
      shots[i].life = 0.85;
      shots[i].active = true;
      return;
    }
  }
}

function wrapBody(body) {
  if (body.x < 0) body.x += gameWidth();
  if (body.x >= gameWidth()) body.x -= gameWidth();
  if (body.y < 0) body.y += gameHeight();
  if (body.y >= gameHeight()) body.y -= gameHeight();
}

function update() {
  let dt = deltaTime();
  if (dt > 0.05) dt = 0.05;

  if (gameOver) {
    if (btnPressed("START")) init();
    return;
  }

  fireWait -= dt;
  ship.invulnerable -= dt;
  if (btnDown("LEFT")) ship.angle -= 3.8 * dt;
  if (btnDown("RIGHT")) ship.angle += 3.8 * dt;

  if (btnDown("UP")) {
    ship.vx += cos(ship.angle) * 135 * dt;
    ship.vy += sin(ship.angle) * 135 * dt;
  }
  // Gentle drag keeps the ship controllable while preserving momentum.
  ship.vx *= 1 - 0.12 * dt;
  ship.vy *= 1 - 0.12 * dt;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrapBody(ship);

  if (btnDown("A") && fireWait <= 0) {
    fireShot();
    fireWait = 0.22;
  }

  for (let i = 0; i < SHOT_CAP; i += 1) {
    if (shots[i].active) {
      shots[i].x += shots[i].vx * dt;
      shots[i].y += shots[i].vy * dt;
      wrapBody(shots[i]);
      shots[i].life -= dt;
      if (shots[i].life <= 0) shots[i].active = false;
    }
  }

  for (let r = 0; r < ROCK_CAP; r += 1) {
    if (rocks[r].active) {
      rocks[r].x += rocks[r].vx * dt;
      rocks[r].y += rocks[r].vy * dt;
      wrapBody(rocks[r]);

      if (ship.invulnerable <= 0 && circleOverlap(ship.x, ship.y, 9, rocks[r].x, rocks[r].y, rocks[r].radius * 0.8)) {
        lives -= 1;
        ship.x = gameWidth() / 2;
        ship.y = gameHeight() / 2;
        ship.vx = 0;
        ship.vy = 0;
        ship.invulnerable = 2;
        if (lives <= 0) gameOver = true;
      }

      for (let b = 0; b < SHOT_CAP; b += 1) {
        if (rocks[r].active && shots[b].active && circleOverlap(shots[b].x, shots[b].y, 2, rocks[r].x, rocks[r].y, rocks[r].radius * 0.8)) {
          shots[b].active = false;
          rocks[r].active = false;
          score += rocks[r].radius >= 18 ? 20 : 50;
          if (rocks[r].radius >= 18) {
            let childRadius = rocks[r].radius * 0.55;
            spawnRock(childRadius);
            spawnRock(childRadius);
          }
        }
      }
    }
  }

  let activeRocks = 0;
  for (let n = 0; n < ROCK_CAP; n += 1) {
    if (rocks[n].active) activeRocks += 1;
  }
  if (activeRocks === 0) {
    for (let m = 0; m < 5; m += 1) spawnRock(28);
  }
}

function drawRock(rock) {
  // Faceted outline gives each boulder a simple arcade look.
  let a0 = rock.x + cos(0) * rock.radius;
  let b0 = rock.y + sin(0) * rock.radius;
  let previousX = a0;
  let previousY = b0;
  for (let p = 1; p <= 9; p += 1) {
    let angle = p * TAU / 9;
    let edgeScale = 0.78 + (p % 3) * 0.1;
    let nextX = rock.x + cos(angle) * rock.radius * edgeScale;
    let nextY = rock.y + sin(angle) * rock.radius * edgeScale;
    drawLine(previousX, previousY, nextX, nextY, WHITE);
    previousX = nextX;
    previousY = nextY;
  }
}

function draw() {
  clear(BLACK);

  for (let i = 0; i < ROCK_CAP; i += 1) {
    if (rocks[i].active) drawRock(rocks[i]);
  }
  for (let j = 0; j < SHOT_CAP; j += 1) {
    if (shots[j].active) drawPixel(shots[j].x, shots[j].y, YELLOW);
  }

  if (!gameOver && (ship.invulnerable <= 0 || floor(millis() / 120) % 2 === 0)) {
    let noseX = ship.x + cos(ship.angle) * 15;
    let noseY = ship.y + sin(ship.angle) * 15;
    let leftX = ship.x + cos(ship.angle + 2.45) * 11;
    let leftY = ship.y + sin(ship.angle + 2.45) * 11;
    let rightX = ship.x + cos(ship.angle - 2.45) * 11;
    let rightY = ship.y + sin(ship.angle - 2.45) * 11;
    drawLine(noseX, noseY, leftX, leftY, CYAN);
    drawLine(leftX, leftY, rightX, rightY, CYAN);
    drawLine(rightX, rightY, noseX, noseY, CYAN);
    if (btnDown("UP")) {
      let tailX = ship.x - cos(ship.angle) * 9;
      let tailY = ship.y - sin(ship.angle) * 9;
      drawLine(tailX, tailY, ship.x - cos(ship.angle) * 17 + sin(ship.angle) * 4, ship.y - sin(ship.angle) * 17 - cos(ship.angle) * 4, ORANGE);
      drawLine(tailX, tailY, ship.x - cos(ship.angle) * 17 - sin(ship.angle) * 4, ship.y - sin(ship.angle) * 17 + cos(ship.angle) * 4, ORANGE);
    }
  }

  drawText("ASTEROIDS", 12, 12, CYAN);
  drawText("SCORE " + score, 12, 34, WHITE);
  drawText("LIVES " + lives, gameWidth() - 100, 12, WHITE);
  drawText("LEFT/RIGHT TURN   UP THRUST   A FIRE", 12, gameHeight() - 24, GRAY);

  if (gameOver) {
    drawTextSize("GAME OVER", gameWidth() / 2 - 95, gameHeight() / 2 - 20, YELLOW, 2);
    drawText("PRESS START TO PLAY AGAIN", gameWidth() / 2 - 105, gameHeight() / 2 + 18, WHITE);
  }
}
