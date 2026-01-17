export function assertSameOrigin(req, res) {
  const allowed = process.env.APP_ORIGIN;
  if (!allowed) return true;

  const origin = req.headers.origin || "";
  const referer = req.headers.referer || "";

  const ok = origin === allowed || referer.startsWith(allowed);
  if (!ok) {
    res.status(403).json({ ok: false, error: "forbidden_origin" });
    return false;
  }
  return true;
}

export function onlyPost(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return false;
  }
  return true;
}

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
  });
}
