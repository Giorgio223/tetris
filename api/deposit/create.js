import { redis } from "../_lib/redis.js";
import { assertSameOrigin, onlyPost, readJson } from "../_lib/auth.js";

function randId() {
  return "d_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;
  if (!onlyPost(req, res)) return;

  const { tonAddress, amountNano } = await readJson(req).catch(() => ({}));
  if (!tonAddress || !amountNano) {
    return res.status(400).json({ ok: false, error: "missing_params" });
  }

  const id = randId();
  const key = `dep:${id}`;

  await redis.set(key, {
    id,
    tonAddress,
    amountNano: String(amountNano),
    status: "pending",
    createdAt: Date.now()
  });

  // TTL 15 минут
  await redis.expire(key, 15 * 60);

  res.json({
    ok: true,
    depositId: id,
    houseAddress: process.env.HOUSE_ADDRESS
  });
}
