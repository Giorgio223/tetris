export default async function handler(req, res) {
  const { address } = req.query || {};

  if (!address || typeof address !== "string") {
    res.status(400).json({ ok: false, error: "missing address" });
    return;
  }

  // В Vercel добавь env переменную TONCENTER_API_KEY (желательно).
  const apiKey = process.env.TONCENTER_API_KEY;

  const endpoint = "https://toncenter.com/api/v2/getAddressBalance";
  const url = new URL(endpoint);
  url.searchParams.set("address", address);

  try {
    const r = await fetch(url.toString(), {
      method: "GET",
      headers: apiKey ? { "X-API-Key": apiKey } : {}
    });

    const j = await r.json();

    if (j && j.ok && j.result != null) {
      const nanotons = BigInt(j.result);
      const ton = Number(nanotons) / 1e9;
      const tonStr = (Math.floor(ton * 1000) / 1000).toFixed(3);

      // Кеш чуть-чуть, чтобы не спамить toncenter
      res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
      res.status(200).json({ ok: true, ton: tonStr });
    } else {
      res.status(200).json({ ok: false, error: j?.error || "no data" });
    }
  } catch {
    res.status(200).json({ ok: false, error: "fetch failed" });
  }
}
