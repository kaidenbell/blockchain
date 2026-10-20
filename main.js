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
    const order = dots.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const swap = Math.floor(Math.random() * (i + 1));
      const hold = order[i];
      order[i] = order[swap];
      order[swap] = hold;
    }
    for (let n = 0; n < order.length; n += 1) {
      const a = order[n];
      if (thoughts.some((thought) => thought.a === a || thought.b === a)) continue;
      const pa = place(dots[a], now);
      let best = -1;
      let bestDist = 40;
      for (let b = 0; b < dots.length; b += 1) {
        if (b === a || dots[b].band !== dots[a].band) continue;
        if (thoughts.some((thought) => thought.a === b || thought.b === b)) continue;
        const pb = place(dots[b], now);
        const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        if (dist < 12 || dist >= bestDist || Math.abs(pa.y - pb.y) > 16) continue;
        bestDist = dist;
        best = b;
      }
      if (best !== -1) {
        thoughts.push({ a, b: best, born: now, life: 1000 + Math.random() * 700 });
        return;
      }
    }
  }

  function draw(now) {
    const clock = reduce ? 1400 : now;
    ctx.clearRect(0, 0, width, height);
    const points = dots.map((dot) => place(dot, clock));

    for (let i = thoughts.length - 1; i >= 0; i -= 1) {
      if (clock - thoughts[i].born >= thoughts[i].life) thoughts.splice(i, 1);
    }
    const goal = reduce ? 3 : 4;
    while (thoughts.length < goal) {
      const before = thoughts.length;
      spawn(clock);
      if (thoughts.length === before) break;
    }

    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    thoughts.forEach((thought) => {
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
      ctx.fillStyle = linked ? "rgba(70, 69, 64, 0.72)" : "rgba(120, 119, 112, 0.42)";
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
