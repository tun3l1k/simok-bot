const tg = window.Telegram?.WebApp;

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#140f1f'); tg.setBackgroundColor('#140f1f'); } catch { /* старый клиент */ }
}

export const haptic = (style = 'light') => { try { tg?.HapticFeedback?.impactOccurred(style); } catch { /* нет вибро */ } };
export const hapticDone = () => { try { tg?.HapticFeedback?.notificationOccurred('success'); } catch { /* нет вибро */ } };

export function shareText(text, link) {
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
}

export const inviteLink = (bot) => `https://t.me/${bot}?start=ref_${tg?.initDataUnsafe?.user?.id ?? ''}`;
