import { redis } from "../_lib/redis.js";
import { assertSameOrigin, onlyPost, readJson } from "../_lib/auth.js";
import { toncenterGet } from "../_lib/toncenter.js";

export default async function handler(req, res) {
  if (!assertSameOrigin(req, res)) return;
  if (!onlyPost(req, res)) return;

  const { depositId } = await readJson(req).catch(() => ({}));
  if (!depositId) return res.status(400).json({ ok: false, error: "missing_depositId" });

  const depKey = `dep:${depositId}`;
  const dep = await redis.get(depKey);
  if (!dep) return res.status(404).json({ ok: false, error: "deposit_not_found" });

  if (dep.status === "confirmed") {
    return res.json({ ok: true, status: "confirmed" });
  }

  const house = process.env.HOUSE_ADDRESS;
  if (!house) return res.status(500).json({ ok: false, error: "missing_HOUSE_ADDRESS" });

  // смотрим последние транзакции на адрес хауса
  const txs = await toncenterGet("getTransactions", { address: house, limit: 20 });

  if (!txs?.ok || !Array.isArray(txs.result)) {
    return res.json({ ok: true, status: "pending", note: "toncenter_unavailable" });
  }

  // Ищем входящую транзакцию: amount совпадает + payload содержит depositId
  // toncenter tx structure varies; поэтому проверяем несколько полей.
  const needAmt = String(dep.amountNano);

  const found = txs.result.find((tx) => {
    try {
      const inMsg = tx.in_msg || tx.inMsg || tx.inMessage;
      if (!inMsg) return false;

      const amt = String(inMsg.value || inMsg.amount || "0");
      if (amt !== needAmt) return false;

      const msgData = inMsg.msg_data || inMsg.message || inMsg.msgData;
      const body = JSON.stringify(msgData || {});
      return body.includes(depositId);
    } catch { return false; }
  });

  if (!found) {
    return res.json({ ok: true, status: "pending" });
  }

  // подтверждаем депозит: зачисляем внутренний баланс
  const userKey = `u:${dep.tonAddress}`;
  const u = (await redis.get(userKey)) || { tonAddress: dep.tonAddress, balanceNano: "0" };

  const newBal = BigInt(u.balanceNano || "0") + BigInt(dep.amountNano);
  u.balanceNano = newBal.toString();

  await redis.set(userKey, u);
  dep.status = "confirmed";
  dep.txHash = found.transaction_id?.hash || found.id || null;

  await redis.set(depKey, dep);
  // можно оставить TTL, но confirmed лучше держать дольше:
  await redis.expire(depKey, 24 * 60 * 60);

  res.json({ ok: true, status: "confirmed" });
}
