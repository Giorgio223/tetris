import { redis } from "../_lib/redis.js";
import { assertSameOrigin, onlyPost, readJson } from "../_lib/auth.js";

function wid() {
  return "w_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;
  if (!onlyPost(req, res)) return;

  const { tonAddress, amountNano } = await readJson(req).catch(() => ({}));
  if (!tonAddress || !amountNano) return res.status(400).json({ ok: false, error: "missing_params" });

  const uKey = `u:${tonAddress}`;
  const u = await redis.get(uKey);
  if (!u) return res.status(404).json({ ok: false, error: "user_not_found" });

  const amt = BigInt(amountNano);
  const bal = BigInt(u.balanceNano || "0");

  if (amt <= 0n) return res.status(400).json({ ok: false, error: "bad_amount" });
  if (amt > bal) return res.status(400).json({ ok: false, error: "insufficient_balance" });

  // резервируем
  u.balanceNano = (bal - amt).toString();
  await redis.set(uKey, u);

  const id = wid();
  await redis.set(`wd:${id}`, {
    id,
    tonAddress,
    amountNano: amt.toString(),
    status: "pending",
    createdAt: Date.now()
  });
  await redis.expire(`wd:${id}`, 24 * 60 * 60);

  res.json({ ok: true, withdrawId: id, status: "pending" });
}
