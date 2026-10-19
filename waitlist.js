const form = document.querySelector("#waitlist-form");
const result = document.querySelector("#waitlist-result");
const errorEl = document.querySelector("#waitlist-error");
const referralInput = document.querySelector("#referral");

const params = new URLSearchParams(location.search);
const incoming = (params.get("ref") || params.get("referred_by") || "").trim();
if (incoming) referralInput.value = incoming;

function shareUrl(code) {
  const url = new URL("/waitlist", location.origin);
  url.searchParams.set("ref", code);
  return url.toString();
}

const SHARE_VIDEO_NAME = "Acend Video.mov";

function xPostText(code) {
  return [
    "A new way to trade is coming to Solana.",
    "",
    "Trade crypto, stocks, and pre-IPOs through one intelligent trading terminal, built for the next generation of finance.",
    "",
    "Get early access to Acend 👇",
    code,
  ].join("\n");
}

function xPostUrl(code) {
  const url = new URL("https://x.com/intent/tweet");
  url.searchParams.set("text", xPostText(code));
  url.searchParams.set("url", shareUrl(code));
  return url.toString();
}

function canAttachVideo() {
  if (!navigator.canShare) return false;
  const probe = new File([""], SHARE_VIDEO_NAME, { type: "video/quicktime" });
  return navigator.canShare({ files: [probe] });
}

let shareVideoPromise;

function loadShareVideo() {
  if (!shareVideoPromise) {
    shareVideoPromise = fetch(new URL(encodeURI(SHARE_VIDEO_NAME), location.origin))
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the video");
        return response.blob();
      })
      .then(
        (blob) =>
          new File([blob], SHARE_VIDEO_NAME, {
            type: blob.type || "video/quicktime",
          })
      )
      .catch((error) => {
        shareVideoPromise = null;
        throw error;
      });
  }
  return shareVideoPromise;
}

function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  const colors = ["#f54e00", "#26251e", "#e6e5e0", "#f2f1ed", "#3b3a33"];
  const pieces = Array.from({ length: 96 }, () => ({
    x: Math.random() * window.innerWidth,
    y: -24 - Math.random() * 220,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vy: 2.2 + Math.random() * 3.2,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.18 + Math.random() * 0.36,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();

  function tick(now) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces.forEach((piece) => {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rot += piece.vr;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
      ctx.restore();
    });
    if (now - start < 2600) requestAnimationFrame(tick);
    else canvas.remove();
  }

  requestAnimationFrame(tick);
}

function show(el, on) {
  el.hidden = !on;
}

function setNote(note, text) {
  const breakAt = " code ";
  const index = text.indexOf(breakAt);
  note.replaceChildren();
  if (index === -1) {
    note.textContent = text;
    return;
  }
  note.append(text.slice(0, index + breakAt.length));
  const lineBreak = document.createElement("br");
  lineBreak.className = "note-break";
  note.append(lineBreak);
  note.append(text.slice(index + breakAt.length));
}

function showResult(data) {
  show(document.querySelector("#waitlist-intro"), false);
  const title = document.querySelector("#result-title");
  const note = document.querySelector("#result-note");
  const place = document.querySelector("#result-place");
  const placeValue = document.querySelector("#result-place-value");
  const points = document.querySelector("#result-points");
  const pointsValue = document.querySelector("#result-points-value");
  const rewards = document.querySelector("#result-rewards");
  const share = document.querySelector("#result-share");
  const code = document.querySelector("#result-code");
  const shareX = document.querySelector("#share-x");

  if (data.pending) {
    title.textContent = "Check your email";
    setNote(note, "Confirm the message we sent and your place will show up here");
  } else if (data.isNew) {
    title.textContent = "You're on the list";
    setNote(
      note,
      data.referralCode
        ? "The first seats are limited. Pass your code on and you move up."
        : "The first seats are limited. We'll email you when one opens."
    );
  } else {
    title.textContent = "You're already on the list";
    setNote(
      note,
      data.referralCode
        ? "The first seats are limited. Pass your code on and you move up."
        : "The first seats are limited. This is the place tied to that email."
    );
  }

  const hasPlace = !data.pending && Number.isFinite(data.position);
  show(place, hasPlace);
  if (hasPlace) placeValue.textContent = `#${data.position}`;

  const hasPoints = !data.pending && Number.isFinite(data.points) && data.points > 0;
  show(points, hasPoints);
  if (hasPoints) pointsValue.textContent = data.points.toLocaleString("en-US");

  const hasCode = !data.pending && data.referralCode;
  show(rewards, Boolean(hasCode));
  show(share, Boolean(hasCode));
  if (hasCode) {
    code.textContent = data.referralCode;
    shareX.href = xPostUrl(data.referralCode);
    if (canAttachVideo()) loadShareVideo().catch(() => {});
  }

  show(result, true);
  if (!data.pending) celebrate();
  title.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  show(errorEl, false);

  const email = form.email.value.trim();
  const referral = form.referral.value.trim();
  if (!form.email.checkValidity() || !email) {
    errorEl.textContent = "Enter a valid email";
    show(errorEl, true);
    form.email.focus();
    return;
  }

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "Joining";

  try {
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, referral }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Could not join the waitlist");
    }
    showResult(data);
  } catch (error) {
    errorEl.textContent = error.message || "Could not join the waitlist";
    show(errorEl, true);
    button.disabled = false;
    button.textContent = label;
  }
});

document.querySelector("#share-x").addEventListener("click", async (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const code = document.querySelector("#result-code").textContent.trim();
  if (!code || !canAttachVideo()) return;

  event.preventDefault();
  const shareX = event.currentTarget;
  if (shareX.classList.contains("is-busy")) return;

  const label = shareX.querySelector(".x-label-text");
  shareX.classList.add("is-busy");
  shareX.setAttribute("aria-busy", "true");
  label.textContent = "Attaching video";

  try {
    const file = await loadShareVideo();
    const payload = {
      files: [file],
      text: `${xPostText(code)}\n${shareUrl(code)}`,
      title: "Acend",
    };
    if (!navigator.canShare(payload)) {
      window.open(xPostUrl(code), "_blank", "noopener,noreferrer");
      return;
    }
    await navigator.share(payload);
  } catch (error) {
    if (error?.name === "AbortError") return;
    window.open(xPostUrl(code), "_blank", "noopener,noreferrer");
  } finally {
    shareX.classList.remove("is-busy");
    shareX.removeAttribute("aria-busy");
    label.textContent = "Post on X";
  }
});

document.querySelector("#copy-code").addEventListener("click", async () => {
  const code = document.querySelector("#result-code").textContent.trim();
  const button = document.querySelector("#copy-code");
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    const field = document.createElement("textarea");
    field.value = code;
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  button.classList.add("is-copied");
  button.setAttribute("aria-label", "Copied");
  window.setTimeout(() => {
    button.classList.remove("is-copied");
    button.setAttribute("aria-label", "Copy referral code");
  }, 1600);
});
