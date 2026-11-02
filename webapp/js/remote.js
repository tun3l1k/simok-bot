// Связь с сервером на Cloudflare. Если API_URL пуст или игра открыта не из Telegram, работает локальный режим.
import { CONFIG } from './config.js?v=mvzrxy89';
import { getInitData } from './telegram.js?v=mvzrxy89';
import { pickSettings } from './state.js?v=mvzrxy89';

export const isRemote = () => Boolean(CONFIG.API_URL && getInitData());

export async function api(action, state, body = {}) {
  let r;
  try {
    r = await fetch(`${CONFIG.API_URL.replace(/\/$/, '')}/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `tma ${getInitData()}` },
      body: JSON.stringify({ ...body, settings: pickSettings(state), ref: new URLSearchParams(location.search).get('ref') || undefined }),
    });
  } catch {
    return { error: 'Нет связи с сервером. Проверь интернет', offline: true };
  }
  try { return await r.json(); } catch { return { error: `Ошибка сервера (${r.status})` }; }
}
