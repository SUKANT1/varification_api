-- Verification logs table
CREATE TABLE IF NOT EXISTS verification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    success INTEGER NOT NULL,
    code_entered TEXT,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    user_agent TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    device_type TEXT,
    device_vendor TEXT,
    device_model TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    language TEXT,
    extension_version TEXT
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_timestamp ON verification_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_success ON verification_logs(success);
CREATE INDEX IF NOT EXISTS idx_ip ON verification_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_country ON verification_logs(country);
