import { redis } from "../_lib/redis.js";
import { assertSameOrigin, onlyPost, readJson } from "../_lib/auth.js";

function payoutMultiplierFromScore(s){
  let mult = 0;
  if(s <= 0) return 0;

  const a = Math.min(s, 10000);
  mult += Math.floor(a / 1000) * 0.1;

  if(s > 10000){
    const b = Math.min(s, 15000) - 10000;
    mult += Math.floor(b / 1000) * 0.2;
  }
  if(s > 15000){
    const c = Math.min(s, 30000) - 15000;
    mult += Math.floor(c / 1000) * 0.3;
  }
  if(s > 30000){
    const d = s - 30000;
    mult += Math.floor(d / 1000) * 0.3;
  }
  return Math.round(mult * 1000) / 1000;
}

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;
  if (!onlyPost(req, res)) return;

  const { tonAddress, score, depositNano, roundId } = await readJson(req).catch(() => ({}));
  if (!tonAddress || !roundId) return res.status(400).json({ ok: false, error: "missing_params" });

  const roundKey = `round:${roundId}`;
  const round = await redis.get(roundKey);
  if (!round || round.tonAddress !== tonAddress) return res.status(404).json({ ok: false, error: "round_not_found" });

  const dep = BigInt(depositNano || "0");
  const sc = Number(score || 0);
  const mult = payoutMultiplierFromScore(sc);

  const payout = BigInt(Math.round(Number(dep) * mult)); // MVP
  const net = payout - dep;

  // Внутренний баланс: возвращаем деп + выигрыш/проигрыш
  const uKey = `u:${tonAddress}`;
  const u = (await redis.get(uKey)) || { tonAddress, balanceNano: "0" };

  // ВАЖНО: баланс должен учитывать что депозит уже зачислялся ранее.
  // Здесь логика такая: payout - это “сколько должно быть на балансе после раунда”.
  // Поэтому просто ДОБАВЛЯЕМ net.
  const newBal = BigInt(u.balanceNano || "0") + net;
  u.balanceNano = newBal.toString();

  await redis.set(uKey, u);

  round.ended = true;
  round.endedAt = Date.now();
  round.finalScore = sc;
  round.mult = mult;
  round.net = net.toString();

  await redis.set(roundKey, round);
  await redis.del(`u:${tonAddress}:activeRound`);

  res.json({ ok: true, mult, netNano: net.toString(), balanceNano: u.balanceNano });
}
