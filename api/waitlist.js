// Proxies the public waitlist form to Waitlister.
// Set WAITLISTER_API_KEY and WAITLISTER_WAITLIST_KEY on the host.
// The key stays on the server. The browser only talks to /api/waitlist.

const API = "https://waitlister.me/api/v1";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function clientIpv4(req) {
  const header = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
  const first = String(header).split(",")[0].trim().replace(/^::ffff:/, "");
  const parts = first.split(".");
  if (parts.length !== 4) return undefined;
  const ok = parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
  return ok ? first : undefined;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function publicSignup(data) {
  const inflated = data.inflated_position;
  const position = data.position;
  return {
    ok: true,
    isNew: Boolean(data.is_new_sign_up),
    pending: Boolean(data.is_pending_confirmation),
    position: Number.isFinite(inflated) ? inflated : Number.isFinite(position) ? position : null,
    points: Number.isFinite(data.points) ? data.points : null,
    referralCode: typeof data.referral_code === "string" && data.referral_code ? data.referral_code : null,
  };
}

async function handler(req, res) {
  const key = process.env.WAITLISTER_API_KEY;
  const waitlist = process.env.WAITLISTER_WAITLIST_KEY;
  if (!key || !waitlist) {
    json(res, 503, { ok: false, error: "The waitlist is not connected yet" });
    return;
  }

  const headers = { "X-Api-Key": key };

  if (req.method === "GET") {
    let response;
    try {
      response = await fetch(`${API}/waitlist/${encodeURIComponent(waitlist)}/stats`, { headers });
    } catch {
      json(res, 502, { ok: false });
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.data) {
      json(res, 200, { ok: false });
      return;
    }
    json(res, 200, {
      ok: true,
      subscribers: data.data.subscribers_total ?? 0,
      referrals: Boolean(data.data.referral_program_enabled),
    });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    json(res, 400, { ok: false, error: "Enter a valid email" });
    return;
  }

  const email = String(body.email || "").trim();
  const referral = String(body.referral || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    json(res, 400, { ok: false, error: "Enter a valid email" });
    return;
  }
  if (referral && !/^[A-Za-z0-9_-]{1,64}$/.test(referral)) {
    json(res, 400, { ok: false, error: "That referral code is not valid" });
    return;
  }

  const metadata = {};
  const ip = clientIpv4(req);
  if (ip) metadata.client_ip = ip;
  if (referral) metadata.referred_by = referral;
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      metadata.referring_domain = new URL(origin).hostname;
    } catch {
      /* ignore a malformed referrer */
    }
  }

  const payload = { email };
  if (Object.keys(metadata).length) payload.metadata = metadata;

  let response;
  try {
    response = await fetch(`${API}/waitlist/${encodeURIComponent(waitlist)}/sign-up`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    json(res, 502, { ok: false, error: "Could not reach the waitlist" });
    return;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const status = response.status === 429 ? 429 : 400;
    json(res, status, {
      ok: false,
      error: status === 429 ? "Too many signups. Try again in a minute" : "Could not join the waitlist",
    });
    return;
  }

  json(res, 200, publicSignup(data));
}

module.exports = handler;
module.exports.publicSignup = publicSignup;
