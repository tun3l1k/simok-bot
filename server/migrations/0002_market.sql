-- Рынок между игроками. Номер на время лота лежит здесь, а не в коллекции продавца.
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller INTEGER NOT NULL,
  item TEXT NOT NULL,              -- номер целиком (JSON)
  price INTEGER NOT NULL,
  tier INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | sold | cancelled
  buyer INTEGER,
  created INTEGER NOT NULL,
  closed INTEGER
);
CREATE INDEX IF NOT EXISTS listings_open ON listings (status, tier, price);
CREATE INDEX IF NOT EXISTS listings_seller ON listings (seller, status);
