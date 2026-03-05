-- Live chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id         bigserial PRIMARY KEY,
  wallet     text NOT NULL,
  message    text NOT NULL CHECK (char_length(message) <= 120),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages(created_at DESC);

-- Auto-delete messages older than 24 hours (run as a cron or manually)
-- DELETE FROM chat_messages WHERE created_at < now() - interval '24 hours';
