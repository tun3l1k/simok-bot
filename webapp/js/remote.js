// Связь с сервером на Cloudflare. Если API_URL пуст или игра открыта не из Telegram, работает локальный режим.
import { CONFIG } from './config.js?v=mw15a2uk';
import { getInitData } from './telegram.js?v=mw15a2uk';
import { pickSettings } from './state.js?v=mw15a2uk';

export const net = { rtt: null, server: null };
export const isRemote = () => Boolean(CONFIG.API_URL && getInitData());

export async function api(action, state, body = {}) {
  let r;
  const t0 = performance.now();
  try {
    // text/plain и подпись в теле: так браузер не шлёт лишний запрос OPTIONS перед каждым действием
    r = await fetch(`${CONFIG.API_URL.replace(/\/$/, '')}/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ ...body, initData: getInitData(), settings: pickSettings(state), ref: new URLSearchParams(location.search).get('ref') || undefined }),
    });
  } catch {
    return { error: 'Нет связи с сервером. Проверь интернет', offline: true };
  }
  try { const j = await r.json(); net.rtt = Math.round(performance.now() - t0); net.server = j.ms; return j; } catch { return { error: `Ошибка сервера (${r.status})` }; }
}
