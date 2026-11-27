CREATE TABLE results (
  did TEXT NOT NULL,
  puzzle_date TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
  reveal_count INTEGER NOT NULL CHECK (reveal_count >= 0),
  check_count INTEGER NOT NULL CHECK (check_count >= 0),
  completed_at TEXT NOT NULL,
  uri TEXT NOT NULL,
  cid TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  PRIMARY KEY (did, puzzle_date)
);
CREATE INDEX results_puzzle_date_idx ON results (puzzle_date);
