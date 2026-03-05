-- Real-time player positions (upserted every ~2s per active player)
CREATE TABLE IF NOT EXISTS player_positions (
  wallet     text PRIMARY KEY,
  x          real NOT NULL,
  y          real NOT NULL,
  col        int  NOT NULL DEFAULT 0,
  row        int  NOT NULL DEFAULT 0,
  char_id    text NOT NULL DEFAULT 'player',
  updated_at timestamptz DEFAULT now()
);

-- Tree slot positions (add to existing trees table)
ALTER TABLE trees ADD COLUMN IF NOT EXISTS slot int NOT NULL DEFAULT 0;
