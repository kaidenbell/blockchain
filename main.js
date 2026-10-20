const toggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const beta = document.querySelector("#beta-gate");
const appLinks = document.querySelectorAll("[data-app]");

let lastFocus = null;

function setMenu(open) {
  toggle.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  mobileNav.classList.toggle("is-open", open);
  document.body.classList.toggle("locked", open || !beta.hidden);
}

function setBeta(open) {
  if (open) {
    lastFocus = document.activeElement;
    setMenu(false);
  }
  beta.hidden = !open;
  document.body.classList.toggle("locked", open);
  if (open) {
    beta.querySelector("[data-beta-close]")?.focus();
  } else if (lastFocus && typeof lastFocus.focus === "function") {
    lastFocus.focus();
  }
}

toggle.addEventListener("click", () => {
  setMenu(!toggle.classList.contains("is-open"));
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenu(false));
});

appLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setBeta(true);
  });
});

beta.querySelectorAll("[data-beta-close]").forEach((el) => {
  el.addEventListener("click", () => setBeta(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
    setBeta(false);
  }
});

const mind = document.querySelector("#mind");
if (mind) {
  const ctx = mind.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dots = [];
  let width = 0;
  let height = 0;
  let running = false;

  function rand(seed) {
    let value = seed;
    return function next() {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), 1 | value);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const thoughts = [];

  function layout() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = mind.clientWidth;
    height = mind.clientHeight;
    mind.width = Math.max(1, Math.floor(width * ratio));
    mind.height = Math.max(1, Math.floor(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    dots.length = 0;
    thoughts.length = 0;
    const random = rand(11);
    const count = Math.round(width / (width < 700 ? 14 : 11));
    for (let i = 0; i < count; i += 1) {
      dots.push({
        x: random() * width,
        lane: (random() - 0.5) * height * 0.72,
        speed: 16 + random() * 26,
        phase: random() * Math.PI * 2,
        r: random() < 0.14 ? 2.3 + random() * 1.6 : 0.7 + random() * 1.3,
        a: 0.16 + random() * 0.28,
      });
    }
  }

  function place(dot, now) {
    const t = now / 1000;
    const x = ((dot.x + dot.speed * t) % (width + 48)) - 24;
    const y =
      height * 0.5 +
      Math.sin(x * 0.011 + t * 0.45 + dot.phase) * Math.min(18, height * 0.12) +
      dot.lane * 0.42;
    return { x, y };
  }

  function spawn(now) {
    for (let n = 0; n < 28; n += 1) {
      const a = Math.floor(Math.random() * dots.length);
      const b = Math.floor(Math.random() * dots.length);
      if (a === b) continue;
      if (thoughts.some((thought) => thought.a === a || thought.b === a || thought.a === b || thought.b === b)) continue;
      const pa = place(dots[a], now);
      const pb = place(dots[b], now);
      const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (dist < 26 || dist > 120) continue;
      thoughts.push({ a, b, born: now, life: 1100 + Math.random() * 800 });
      return;
    }
  }

  function draw(now) {
    const clock = reduce ? 1400 : now;
    ctx.clearRect(0, 0, width, height);
    const points = dots.map((dot) => place(dot, clock));

    for (let i = thoughts.length - 1; i >= 0; i -= 1) {
      if (clock - thoughts[i].born >= thoughts[i].life) thoughts.splice(i, 1);
    }
    if (!reduce) {
      if (thoughts.length === 0) spawn(clock);
      else if (thoughts.length === 1 && clock - thoughts[0].born > thoughts[0].life * 0.45 && Math.random() < 0.012) spawn(clock);
    } else if (thoughts.length === 0) {
      spawn(clock);
    }

    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    thoughts.slice(0, 2).forEach((thought) => {
      const age = (clock - thought.born) / thought.life;
      const fade = Math.sin(Math.min(1, Math.max(0, age)) * Math.PI);
      const from = points[thought.a];
      const to = points[thought.b];
      ctx.strokeStyle = `rgba(38, 37, 30, ${0.42 * fade})`;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });

    points.forEach((point, i) => {
      const linked = thoughts.some((thought) => thought.a === i || thought.b === i);
      ctx.beginPath();
      ctx.fillStyle = `rgba(90, 89, 82, ${linked ? Math.min(0.78, dots[i].a + 0.28) : dots[i].a})`;
      ctx.arc(point.x, point.y, dots[i].r, 0, Math.PI * 2);
      ctx.fill();
    });

    if (running) requestAnimationFrame(draw);
  }

  layout();
  window.addEventListener("resize", () => {
    layout();
    if (reduce) draw(0);
  });

  if (reduce) {
    draw(0);
  } else {
    const view = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !running) {
        running = true;
        requestAnimationFrame(draw);
      } else if (!visible) {
        running = false;
      }
    });
    view.observe(mind);
  }
}
