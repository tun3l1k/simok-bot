// Проверка Telegram initData: подпись HMAC с ключом из токена бота. Без неё никому нельзя верить, кто есть кто.
const enc = new TextEncoder();

async function hmac(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, msgBytes));
}
const toHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Возвращает { user, startParam } или null, если подпись неверна или данные старше maxAgeSec
export async function verifyInitData(initData, botToken, { maxAgeSec = 86400, now = Date.now() } = {}) {
  if (!initData || !botToken) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = await hmac(enc.encode('WebAppData'), enc.encode(botToken));
  const sig = toHex(await hmac(secret, enc.encode(check)));
  if (!safeEqual(sig, hash)) return null;
  const authDate = Number(p.get('auth_date'));
  if (!authDate || now / 1000 - authDate > maxAgeSec) return null;
  try {
    const user = JSON.parse(p.get('user'));
    if (!Number.isSafeInteger(user?.id)) return null;
    return { user, startParam: p.get('start_param') };
  } catch { return null; }
}
