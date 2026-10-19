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

function show(el, on) {
  el.hidden = !on;
}

function showResult(data) {
  show(document.querySelector("#waitlist-intro"), false);
  const title = document.querySelector("#result-title");
  const note = document.querySelector("#result-note");
  const place = document.querySelector("#result-place");
  const placeValue = document.querySelector("#result-place-value");
  const points = document.querySelector("#result-points");
  const share = document.querySelector("#result-share");
  const code = document.querySelector("#result-code");
  const link = document.querySelector("#result-link");

  if (data.pending) {
    title.textContent = "Check your email";
    note.textContent = "Confirm the message we sent and your place will show up here";
  } else if (data.isNew) {
    title.textContent = "You're on the list";
    note.textContent = data.referralCode
      ? "Share your code and you move up when someone joins with it"
      : "We'll email you when a spot opens";
  } else {
    title.textContent = "You're already on the list";
    note.textContent = "This is the place tied to that email";
  }

  const hasPlace = !data.pending && Number.isFinite(data.position);
  show(place, hasPlace);
  if (hasPlace) placeValue.textContent = `#${data.position}`;

  const hasPoints = !data.pending && Number.isFinite(data.points) && data.points > 0;
  show(points, hasPoints);
  if (hasPoints) points.textContent = `${data.points.toLocaleString("en-US")} points`;

  const hasCode = !data.pending && data.referralCode;
  show(share, Boolean(hasCode));
  if (hasCode) {
    code.textContent = data.referralCode;
    link.value = shareUrl(data.referralCode);
  }

  show(result, true);
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

document.querySelector("#copy-link").addEventListener("click", async () => {
  const link = document.querySelector("#result-link");
  const button = document.querySelector("#copy-link");
  try {
    await navigator.clipboard.writeText(link.value);
  } catch {
    link.focus();
    link.select();
    document.execCommand("copy");
  }
  const label = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = label;
  }, 1600);
});
