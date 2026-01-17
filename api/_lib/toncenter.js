export async function toncenterGet(path, params = {}) {
  const apiKey = process.env.TONCENTER_API_KEY || "";
  const base = "https://toncenter.com/api/v2/" + path;

  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const r = await fetch(url.toString(), {
    headers: apiKey ? { "X-API-Key": apiKey } : {}
  });

  const j = await r.json();
  return j;
}

// Нанотоны -> строка
export function nanoToTonStr(nanoStr) {
  const nano = BigInt(nanoStr);
  const ton = Number(nano) / 1e9;
  return (Math.floor(ton * 1000) / 1000).toFixed(3);
}
