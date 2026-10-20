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
      if (fade > 0) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(38, 37, 30, ${0.16 * fade})`;
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = fade > 0 ? `rgba(38, 37, 30, ${0.35 + 0.6 * fade})` : "rgba(120, 119, 112, 0.42)";
      ctx.arc(point.x, point.y, 1.7 + fade * 0.6, 0, Math.PI * 2);
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
