import { redis } from "../_lib/redis.js";
import { assertSameOrigin, onlyPost, readJson } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;
  if (!onlyPost(req, res)) return;

  const { roundId, tonAddress, state, score } = await readJson(req).catch(() => ({}));
  if (!roundId || !tonAddress) return res.status(400).json({ ok: false, error: "missing_params" });

  const key = `round:${roundId}`;
  const round = await redis.get(key);
  if (!round || round.tonAddress !== tonAddress) return res.status(404).json({ ok: false, error: "round_not_found" });

  round.state = state || round.state;
  round.score = Number(score ?? round.score ?? 0);

  await redis.set(key, round);
  await redis.expire(key, 60 * 60);
  await redis.expire(`u:${tonAddress}:activeRound`, 60 * 60);

  res.json({ ok: true });
}
