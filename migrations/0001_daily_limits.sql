-- Daily counts behind the chat's limits (src/lib/bot/usage.ts). Days are UTC
-- dates as YYYY-MM-DD. No IP is ever stored: a visitor is a hash of their IP,
-- the day and a secret salt, so the same person can't be followed across days.

CREATE TABLE visitor_messages (
  visitor_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (visitor_hash, day)
);

-- Estimated spend across all visitors, one row per day. Money is in integer
-- micro-dollars so totals never drift.
CREATE TABLE daily_usage (
  day TEXT PRIMARY KEY,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_micro_usd INTEGER NOT NULL DEFAULT 0
);
