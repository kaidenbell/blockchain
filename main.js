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

const globe = document.querySelector("#globe");
if (globe) {
  const gctx = globe.getContext("2d");
  const reduceGlobe = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const globeDots = [];
  let gw = 0;
  let gh = 0;
  let globeRunning = false;

  function onLand(lat, lon) {
    const box = (west, east, south, north) => lon >= west && lon <= east && lat >= south && lat <= north;
    if (box(-18, 52, -35, 37)) {
      if (lat > 28 && lon < -6) return false;
      if (lat < -28 && lon < 14) return false;
      if (lat > 18 && lon > 40) return false;
      return true;
    }
    if (box(-11, 40, 36, 71)) return !(lat > 62 && lon < 4);
    if (box(40, 145, 8, 74)) {
      if (lat < 16 && lon > 108) return false;
      if (lat > 58 && lon < 62) return false;
      return true;
    }
    if (box(113, 154, -44, -11)) return true;
    if (box(-168, -53, 14, 72)) {
      if (lat < 26 && lon > -90) return false;
      if (lon < -140 && lat < 52) return false;
      return true;
    }
    if (box(-82, -34, -56, 13)) {
      if (lat > 8 && lon < -72) return false;
      if (lat < -42 && lon > -62) return false;
      return true;
    }
    return false;
  }

  function buildGlobe() {
    globeDots.length = 0;
    const count = 820;
    for (let i = 0; i < count; i += 1) {
      const y = 1 - (i / (count - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      const x = Math.cos(theta) * ring;
      const z = Math.sin(theta) * ring;
      const lat = Math.asin(y) * (180 / Math.PI);
      const lon = Math.atan2(z, x) * (180 / Math.PI);
      globeDots.push({ x, y, z, land: onLand(lat, lon) });
    }
  }

  function layoutGlobe() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    gw = globe.clientWidth;
    gh = globe.clientHeight;
    globe.width = Math.max(1, Math.floor(gw * ratio));
    globe.height = Math.max(1, Math.floor(gh * ratio));
    gctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawGlobe(now) {
    const rot = reduceGlobe ? 0.55 : now * 0.00032;
    gctx.clearRect(0, 0, gw, gh);
    const radius = Math.min(gw, gh) * 0.44;
    const cx = gw / 2;
    const cy = gh / 2;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const view = globeDots.map((dot) => {
      const x = dot.x * cos + dot.z * sin;
      const z = -dot.x * sin + dot.z * cos;
      return { x, y: dot.y, z, land: dot.land };
    });
    view.sort((a, b) => a.z - b.z);

    view.forEach((dot) => {
      const edge = Math.abs(dot.z) < 0.16;
      if (!edge && !(dot.land && dot.z > 0.02)) return;
      const px = cx + (dot.x / (1.55 - dot.z * 0.28)) * radius;
      const py = cy - (dot.y / (1.55 - dot.z * 0.28)) * radius;
      gctx.beginPath();
      gctx.fillStyle = "rgba(16, 16, 17, 0.8)";
      gctx.arc(px, py, dot.land ? 1.15 : 0.85, 0, Math.PI * 2);
      gctx.fill();
    });

    if (globeRunning) requestAnimationFrame(drawGlobe);
  }

  buildGlobe();
  layoutGlobe();
  window.addEventListener("resize", () => {
    layoutGlobe();
    if (reduceGlobe) drawGlobe(0);
  });
  if (reduceGlobe) {
    drawGlobe(0);
  } else {
    const watch = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !globeRunning) {
        globeRunning = true;
        requestAnimationFrame(drawGlobe);
      } else if (!visible) {
        globeRunning = false;
      }
    });
    watch.observe(globe);
  }
}

const mind = document.querySelector("#mind");
if (mind) {
  const ctx = mind.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dots = [];
  let width = 0;
  let height = 0;
  let running = false;

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
    const gap = width < 700 ? 20 : 16;
    for (let band = 0; band < 3; band += 1) {
      for (let x = -gap; x < width + gap; x += gap) {
        dots.push({
          band,
          x,
          speed: 18 + band * 7,
          phase: band * 2.05,
          offset: (band - 1) * Math.min(30, height * 0.2),
        });
      }
    }
  }

  function place(dot, now) {
    const t = now / 1000;
    const x = ((dot.x + dot.speed * t) % (width + 36)) - 18;
    const y =
      height * 0.5 +
      dot.offset +
      Math.sin((x / Math.max(width, 1)) * Math.PI * 2 * 1.2 + t * 0.65 + dot.phase) * Math.min(13, height * 0.08);
    return { x, y };
  }

  function spawn(now) {
    const open = [];
    for (let i = 0; i < dots.length; i += 1) {
      if (!thoughts.some((thought) => thought.index === i)) open.push(i);
    }
    if (!open.length) return;
    thoughts.push({
      index: open[Math.floor(Math.random() * open.length)],
      born: now,
      life: 900 + Math.random() * 800,
    });
  }

  function draw(now) {
    const clock = reduce ? 1400 : now;
    ctx.clearRect(0, 0, width, height);
    const points = dots.map((dot) => place(dot, clock));

    for (let i = thoughts.length - 1; i >= 0; i -= 1) {
      if (clock - thoughts[i].born >= thoughts[i].life) thoughts.splice(i, 1);
    }
    const goal = reduce ? 4 : 6;
    while (thoughts.length < goal) {
      const before = thoughts.length;
      spawn(clock);
      if (thoughts.length === before) break;
    }

    const glow = new Map();
    thoughts.forEach((thought) => {
      const age = (clock - thought.born) / thought.life;
      glow.set(thought.index, Math.sin(Math.min(1, Math.max(0, age)) * Math.PI));
    });

    points.forEach((point, i) => {
      const fade = glow.get(i) || 0;
      ctx.beginPath();
      ctx.fillStyle = fade > 0 ? `rgba(16, 16, 17, ${0.35 + 0.6 * fade})` : "rgba(120, 119, 112, 0.42)";
      ctx.arc(point.x, point.y, 1.7, 0, Math.PI * 2);
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
