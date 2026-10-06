-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  permission INTEGER NOT NULL DEFAULT 0, -- 0=P0 user, 1=P1 admin, 2=P2 super admin
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Committee Days table (เปิด session ประจำเดือน)
CREATE TABLE IF NOT EXISTS committee_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  inspection_date TEXT NOT NULL, -- วันที่เดินตรวจ YYYY-MM-DD
  month_year TEXT NOT NULL, -- YYYY-MM สำหรับ filter รายเดือน
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, closed
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Safety Issues table (รายการที่ส่งเข้าระบบ)
CREATE TABLE IF NOT EXISTS safety_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_code TEXT NOT NULL UNIQUE, -- รหัส: YYYYMM-NNNN เช่น 202601-0001
  committee_day_id INTEGER NOT NULL,
  submitted_by INTEGER NOT NULL,
  issue_type TEXT NOT NULL, -- 'person' (อันตรายจากบุคคล) or 'condition' (สภาพงาน)
  location TEXT,
  description TEXT NOT NULL,
  remarks TEXT,
  image_before TEXT, -- base64 encoded image
  image_after TEXT, -- base64 encoded image (หลังแก้ไข)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, resolved
  resolved_by INTEGER,
  resolved_at TEXT,
  resolve_remarks TEXT,
  month_year TEXT NOT NULL, -- YYYY-MM
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (committee_day_id) REFERENCES committee_days(id),
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_safety_issues_month ON safety_issues(month_year);
CREATE INDEX IF NOT EXISTS idx_safety_issues_committee ON safety_issues(committee_day_id);
CREATE INDEX IF NOT EXISTS idx_safety_issues_status ON safety_issues(status);
CREATE INDEX IF NOT EXISTS idx_committee_days_month ON committee_days(month_year);
CREATE INDEX IF NOT EXISTS idx_committee_days_status ON committee_days(status);

-- Default super admin (password: Admin@1234 - change immediately!)
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, permission)
VALUES (
  'superadmin',
  'superadmin@jdecommitee.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhu',
  'Super Administrator',
  2
);
