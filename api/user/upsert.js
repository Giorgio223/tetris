import { redis } from "../_lib/redis.js";
import { assertSameOrigin, onlyPost, readJson } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;
  if (!onlyPost(req, res)) return;

  const { tonAddress } = await readJson(req).catch(() => ({}));
  if (!tonAddress) return res.status(400).json({ ok: false, error: "missing_tonAddress" });

  const key = `u:${tonAddress}`;
  const exists = await redis.get(key);

  if (!exists) {
    await redis.set(key, {
      tonAddress,
      balanceNano: "0",
      createdAt: Date.now()
    });
  }

  res.json({ ok: true });
}
