import { redis } from "../_lib/redis.js";
import { assertSameOrigin } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;

  const tonAddress = req.query.address;
  if (!tonAddress) return res.status(400).json({ ok: false, error: "missing_address" });

  const rid = await redis.get(`u:${tonAddress}:activeRound`);
  if (!rid) return res.json({ ok: true, round: null });

  const round = await redis.get(`round:${rid}`);
  if (!round) return res.json({ ok: true, round: null });

  res.json({ ok: true, round });
}
