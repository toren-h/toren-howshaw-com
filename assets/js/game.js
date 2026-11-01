// Spaceship obstacle course: fly through the gaps in the walls and dodge asteroids.
(() => {
  const launchBtn = document.getElementById("launch-ship");
  const overlay = document.getElementById("game");
  if (!launchBtn || !overlay) return;

  const canvas = overlay.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const closeBtn = overlay.querySelector(".game-close");

  const GATES = 25;         // walls to fly through
  const WALL_W = 44;
  const SHIP_R = 14;        // collision radius
  const TITLE_FONT = '"Orbitron", sans-serif';
  const TEXT_FONT = '"Share Tech Mono", monospace';

  let W = 0, H = 0;
  let state = "ready";      // ready | playing | crashed | won
  let ship, obstacles, particles, stars, finishX;
  let dist = 0, time = 0, runTime = 0, endedAt = 0, newRecord = false;
  let raf = 0, last = 0;
  let accent = "#2ff3ff";
  let pointer = null;
  const keys = new Set();

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const getBest = () => Number(localStorage.getItem("shipBest")) || 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- Course ---------- */
  function buildCourse() {
    obstacles = [];
    let x = W + 200;
    for (let i = 0; i < GATES; i++) {
      const t = i / (GATES - 1);            // 0 → 1 difficulty
      obstacles.push({
        type: "gate",
        x,
        gap: 270 - t * 120,                 // gap gets smaller
        pos: Math.random(),                 // where the gap sits (0 top, 1 bottom)
        amp: i > 4 && Math.random() < 0.5 ? rand(30, 70) : 0, // some gaps move
        phase: rand(0, Math.PI * 2),
      });
      const spacing = 460 - t * 100;
      const rocks = Math.floor(t * 4);      // more asteroids later on
      for (let k = 0; k < rocks; k++) {
        obstacles.push({
          type: "rock",
          x: x + spacing * rand(0.3, 0.7),
          y: rand(0, H),
          r: rand(10, 24),
          vy: rand(-80, 80),
          rot: rand(0, 6),
          spin: rand(-2, 2),
          shape: Array.from({ length: 9 }, () => rand(0.75, 1.15)),
        });
      }
      x += spacing;
    }
    finishX = x + 150;
  }

  function gateSpan(g) {
    const gap = Math.min(g.gap, H * 0.55);
    const minC = gap / 2 + 20;
    const maxC = H - gap / 2 - 20;
    const c = clamp(minC + g.pos * (maxC - minC) + g.amp * Math.sin(time * 1.6 + g.phase), minC, maxC);
    return [c - gap / 2, c + gap / 2];
  }

  function reset() {
    ship = { x: 120, y: H / 2, vx: 0, vy: 0 };
    particles = [];
    dist = 0;
    runTime = 0;
    newRecord = false;
    buildCourse();
    stars = Array.from({ length: 160 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1) }));
  }

  function launch() {
    if (time - endedAt < 0.6) return; // avoid instant restart from a held key
    reset();
    state = "playing";
  }

  function burst(color, count) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 320);
      const life = rand(0.4, 1.2);
      particles.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life,
        c: typeof color === "function" ? color() : color });
    }
  }

  function crash() {
    state = "crashed";
    endedAt = time;
    burst(() => (Math.random() < 0.5 ? "#ffb02e" : "#ff4d2e"), 70);
  }

  function win() {
    state = "won";
    endedAt = time;
    const best = getBest();
    if (!best || runTime < best) {
      localStorage.setItem("shipBest", runTime.toFixed(2));
      newRecord = true;
    }
    burst(() => (Math.random() < 0.5 ? accent : "#ffe81f"), 90);
  }

  /* ---------- Update ---------- */
  function update(dt) {
    time += dt;
    const playing = state === "playing";
    const speed = playing ? 240 + 160 * (dist / finishX) : 60;

    for (const s of stars) {
      s.x -= speed * s.z * dt;
      if (s.x < 0) { s.x += W; s.y = rand(0, H); }
    }
    for (const o of obstacles) {
      if (o.type !== "rock") continue;
      o.y += o.vy * dt;
      o.rot += o.spin * dt;
      if (o.y < -o.r) o.y = H + o.r;
      else if (o.y > H + o.r) o.y = -o.r;
    }
    particles = particles.filter((p) => (p.life -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }

    if (!playing) return;
    runTime += dt;
    dist += speed * dt;

    // Controls: keyboard thrust, or steer towards the finger / mouse
    const A = 1700;
    if (keys.has("ArrowUp") || keys.has("KeyW")) ship.vy -= A * dt;
    if (keys.has("ArrowDown") || keys.has("KeyS")) ship.vy += A * dt;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) ship.vx -= A * dt;
    if (keys.has("ArrowRight") || keys.has("KeyD")) ship.vx += A * dt;
    const drag = Math.exp(-4 * dt);
    ship.vx *= drag;
    ship.vy *= drag;
    if (pointer) {
      ship.vx = (pointer.x - ship.x) * 6;
      ship.vy = (pointer.y - ship.y) * 6;
    }
    ship.x = clamp(ship.x + ship.vx * dt, 40, W * 0.6);
    ship.y = clamp(ship.y + ship.vy * dt, SHIP_R, H - SHIP_R);

    for (const o of obstacles) {
      const sx = o.x - dist;
      if (sx < -100 || sx > W + 100) continue;
      if (o.type === "gate") {
        if (Math.abs(ship.x - sx) < WALL_W / 2 + SHIP_R * 0.8) {
          const [top, bottom] = gateSpan(o);
          if (ship.y - SHIP_R * 0.7 < top || ship.y + SHIP_R * 0.7 > bottom) return crash();
        }
      } else if (Math.hypot(ship.x - sx, ship.y - o.y) < o.r + SHIP_R * 0.7) {
        return crash();
      }
    }
    if (dist + ship.x > finishX) win();
  }

  /* ---------- Drawing ---------- */
  function drawGate(g, sx) {
    const [top, bottom] = gateSpan(g);
    const x = sx - WALL_W / 2;
    const grad = ctx.createLinearGradient(x, 0, x + WALL_W, 0);
    grad.addColorStop(0, "#22262f");
    grad.addColorStop(0.5, "#6b7385");
    grad.addColorStop(1, "#22262f");
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, WALL_W, top);
    ctx.fillRect(x, bottom, WALL_W, H - bottom);

    ctx.fillStyle = "rgba(0,0,0,.45)"; // panel seams
    for (let y = top - 40; y > 0; y -= 40) ctx.fillRect(x, y, WALL_W, 2);
    for (let y = bottom + 40; y < H; y += 40) ctx.fillRect(x, y, WALL_W, 2);

    ctx.save();
    ctx.shadowColor = "#ff3b3b";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(x, top - 4, WALL_W, 4);
    ctx.fillRect(x, bottom, WALL_W, 4);
    ctx.restore();
  }

  function drawRock(r, sx) {
    ctx.save();
    ctx.translate(sx, r.y);
    ctx.rotate(r.rot);
    ctx.beginPath();
    r.shape.forEach((m, i) => {
      const a = (i / r.shape.length) * Math.PI * 2;
      const px = Math.cos(a) * r.r * m;
      const py = Math.sin(a) * r.r * m;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = "#5a5048";
    ctx.fill();
    ctx.strokeStyle = "#8c7f72";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawFinish(fx) {
    const size = 15;
    for (let y = 0, row = 0; y < H; y += size, row++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = (row + c) % 2 ? "#fff" : "#111";
        ctx.fillRect(fx + c * size, y, size, size);
      }
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(clamp(ship.vy * 0.0012, -0.4, 0.4));

    const flame = 10 + Math.random() * 8 + (state === "playing" ? 8 : 0);
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 20;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-14, -5); ctx.lineTo(-14 - flame, 0); ctx.lineTo(-14, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#8d96a8"; // wings
    ctx.beginPath();
    ctx.moveTo(-6, -4); ctx.lineTo(-16, -18); ctx.lineTo(-8, -18); ctx.lineTo(6, -4);
    ctx.moveTo(-6, 4); ctx.lineTo(-16, 18); ctx.lineTo(-8, 18); ctx.lineTo(6, 4);
    ctx.fill();

    ctx.fillStyle = "#d8dde6"; // hull
    ctx.beginPath();
    ctx.moveTo(22, 0); ctx.lineTo(-14, -7); ctx.lineTo(-14, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffe81f"; // stripe
    ctx.fillRect(-12, -1, 10, 2);
    ctx.fillStyle = accent; // cockpit
    ctx.beginPath();
    ctx.ellipse(3, 0, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHud() {
    const gates = obstacles.filter((o) => o.type === "gate" && o.x - dist < ship.x).length;
    const best = getBest();
    ctx.font = `15px ${TEXT_FONT}`;
    ctx.textAlign = "left";
    ctx.fillStyle = "#e8e8e8";
    ctx.fillText(`TIME ${runTime.toFixed(1)}s   GATES ${gates}/${GATES}${best ? `   BEST ${best.toFixed(1)}s` : ""}`, 20, 32);

    const p = clamp((dist + ship.x) / finishX, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,.15)";
    ctx.fillRect(20, H - 22, W - 40, 6);
    ctx.fillStyle = "#ffe81f";
    ctx.fillRect(20, H - 22, (W - 40) * p, 6);
  }

  function drawMessage() {
    let lines;
    if (state === "ready") {
      lines = ["READY, PILOT?", "Fly through the gaps. Dodge the asteroids.",
        "Arrows / WASD to fly · hold & drag on mouse or touch", "Press Space or tap to launch"];
    } else if (state === "crashed") {
      lines = ["SHIP DESTROYED", "That's no moon… that's a wall.", "Press Space or tap to try again · Esc to exit"];
    } else if (state === "won") {
      lines = ["COURSE COMPLETE", `Time ${runTime.toFixed(2)}s${newRecord ? " · NEW RECORD!" : ""}`,
        "Great flying! Now send me a transmission.", "Press Space or tap to fly again · Esc to exit"];
    } else {
      return;
    }
    const boxW = Math.min(W - 40, 560);
    const boxH = 70 + lines.length * 30;
    const bx = (W - boxW) / 2;
    const by = (H - boxH) / 2;
    ctx.fillStyle = "rgba(0,0,0,.75)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe81f";
    ctx.font = `900 ${clamp(W / 18, 22, 38)}px ${TITLE_FONT}`;
    ctx.fillText(lines[0], W / 2, by + 52);
    ctx.fillStyle = "#e8e8e8";
    ctx.font = `${clamp(W / 40, 12, 16)}px ${TEXT_FONT}`;
    lines.slice(1).forEach((l, i) => ctx.fillText(l, W / 2, by + 92 + i * 28));
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + s.z * 0.7})`;
      ctx.fillRect(s.x, s.y, s.z * 2, s.z * 2);
    }
    for (const o of obstacles) {
      const sx = o.x - dist;
      if (sx < -60 || sx > W + 60) continue;
      if (o.type === "gate") drawGate(o, sx); else drawRock(o, sx);
    }
    const fx = finishX - dist;
    if (fx < W + 40) drawFinish(fx);
    if (state !== "crashed") drawShip();
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    drawHud();
    drawMessage();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- Open / close ---------- */
  function open() {
    overlay.hidden = false;
    document.body.classList.add("game-active");
    accent = getComputedStyle(document.body).getPropertyValue("--saber").trim() || accent;
    resize();
    reset();
    state = "ready";
    endedAt = -1;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    canvas.focus();
  }

  function close() {
    cancelAnimationFrame(raf);
    overlay.hidden = true;
    document.body.classList.remove("game-active");
    keys.clear();
    pointer = null;
    launchBtn.focus();
  }

  launchBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  window.addEventListener("resize", () => { if (!overlay.hidden) resize(); });

  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") return close();
    if ((e.code === "Space" || e.key === "Enter") && state !== "playing") {
      e.preventDefault();
      return launch();
    }
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    keys.add(e.code);
  });
  document.addEventListener("keyup", (e) => keys.delete(e.code));

  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "playing") launch();
    pointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (pointer) pointer = { x: e.clientX, y: e.clientY };
  });
  const release = () => { pointer = null; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
})();
