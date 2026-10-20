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

  function layout() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = mind.clientWidth;
    height = mind.clientHeight;
    mind.width = Math.max(1, Math.floor(width * ratio));
    mind.height = Math.max(1, Math.floor(height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    dots.length = 0;
    const random = rand(11);
    const gap = width < 700 ? 16 : 13;
    for (let x = -24; x < width + 24; x += gap) {
      const count = 2 + Math.floor(random() * 2);
      for (let i = 0; i < count; i += 1) {
        dots.push({
          x: x + (random() - 0.5) * gap * 0.85,
          jitter: (random() - 0.5) * 26,
          r: random() < 0.14 ? 2.4 + random() * 1.7 : 0.65 + random() * 1.35,
          a: 0.14 + random() * 0.3,
        });
      }
    }
    dots.sort((a, b) => a.x - b.x);
  }

  function wave(dot, time) {
    const u = dot.x / Math.max(width, 1);
    const amp = Math.min(22, height * 0.15);
    return (
      height * 0.54 +
      Math.sin(u * Math.PI * 2 * 1.05 + time) * amp +
      Math.sin(u * Math.PI * 2 * 2.15 - time * 0.62) * amp * 0.26 +
      dot.jitter * (0.62 + 0.38 * Math.sin(time * 0.45 + u * 8))
    );
  }

  function draw(now) {
    const time = reduce ? 0.8 : now * 0.00028;
    ctx.clearRect(0, 0, width, height);
    const ys = dots.map((dot) => wave(dot, time));
    const span = width + 180;
    const focus = reduce ? width * 0.42 : ((now * 0.000085) * span) % span - 90;
    const links = [];

    for (let i = 0; i < dots.length; i += 1) {
      const near = Math.abs(dots[i].x - focus);
      if (near > 86) continue;
      let best = -1;
      let bestDist = 34;
      for (let j = i + 1; j < dots.length && dots[j].x - dots[i].x < 40; j += 1) {
        const dist = Math.hypot(dots[j].x - dots[i].x, ys[j] - ys[i]);
        if (dist < bestDist) {
          bestDist = dist;
          best = j;
        }
      }
      if (best !== -1) links.push({ i, j: best, strength: 1 - near / 86 });
    }

    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    links.forEach((link) => {
      ctx.strokeStyle = `rgba(38, 37, 30, ${0.22 * link.strength})`;
      ctx.beginPath();
      ctx.moveTo(dots[link.i].x, ys[link.i]);
      ctx.lineTo(dots[link.j].x, ys[link.j]);
      ctx.stroke();
    });

    for (let i = 0; i < dots.length; i += 1) {
      const near = Math.abs(dots[i].x - focus);
      const hot = near < 86 ? 1 - near / 86 : 0;
      ctx.beginPath();
      ctx.fillStyle = `rgba(90, 89, 82, ${Math.min(0.7, dots[i].a + hot * 0.22)})`;
      ctx.arc(dots[i].x, ys[i], dots[i].r + hot * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

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
