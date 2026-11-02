-- Игроки: всё, кто открывал игру или писал боту
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,          -- Telegram id
  name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  joined INTEGER NOT NULL,
  seen INTEGER NOT NULL,
  ref TEXT,                        -- Telegram id пригласившего
  started INTEGER NOT NULL DEFAULT 0, -- писал боту, ему можно отправлять сообщения
  blocked INTEGER NOT NULL DEFAULT 0  -- заблокировал бота
);
CREATE INDEX IF NOT EXISTS users_joined ON users (joined);
CREATE INDEX IF NOT EXISTS users_seen ON users (seen);
CREATE INDEX IF NOT EXISTS users_ref ON users (ref);

-- Прогресс игры. ver растёт при каждой записи: так две одновременные операции не затирают друг друга
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,
  ver INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL
);

-- Рассылки админа: делаются порциями, потому что у Worker есть лимит запросов на один запуск
CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,        -- где лежит исходное сообщение
  message_id INTEGER NOT NULL,
  status_chat INTEGER,             -- сообщение с прогрессом
  status_msg INTEGER,
  status TEXT NOT NULL DEFAULT 'running', -- running | done
  cursor INTEGER NOT NULL DEFAULT 0,      -- id последнего обработанного игрока
  total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
);

-- Что админ делает сейчас (ждём текст рассылки / подтверждение). Worker не помнит ничего между запросами
CREATE TABLE IF NOT EXISTS admin_state (
  admin_id INTEGER PRIMARY KEY,
  step TEXT NOT NULL,              -- text | confirm
  chat_id INTEGER,
  message_id INTEGER
);
