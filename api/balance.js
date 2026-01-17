import { redis } from "./_lib/redis.js";
import { assertSameOrigin } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;

  const tonAddress = req.query.address;
  if (!tonAddress) return res.status(400).json({ ok: false, error: "missing_address" });

  const u = await redis.get(`u:${tonAddress}`);
  if (!u) return res.json({ ok: true, balanceNano: "0" });

  res.json({ ok: true, balanceNano: u.balanceNano || "0" });
}
