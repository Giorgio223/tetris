import { redis } from "../_lib/redis.js";
import { assertSameOrigin, onlyPost, readJson } from "../_lib/auth.js";

function roundId() {
  return "r_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;
  if (!onlyPost(req, res)) return;

  const { tonAddress } = await readJson(req).catch(() => ({}));
  if (!tonAddress) return res.status(400).json({ ok: false, error: "missing_tonAddress" });

  const id = roundId();
  const key = `round:${id}`;

  const round = {
    id,
    tonAddress,
    state: null,       // сюда кладём board/tray/score если хочешь на сервере
    score: 0,
    startedAt: Date.now(),
    ended: false
  };

  await redis.set(key, round);
  await redis.expire(key, 60 * 60); // 1 час
  await redis.set(`u:${tonAddress}:activeRound`, id);
  await redis.expire(`u:${tonAddress}:activeRound`, 60 * 60);

  res.json({ ok: true, roundId: id });
}
