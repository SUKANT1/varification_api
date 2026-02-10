# Daily Verification API

A Cloudflare Workers-based verification API with daily-changing codes based on IST timezone. Includes comprehensive logging of verification attempts with IP address, device info, and geolocation.

## Features

- 🔐 **Daily Verification Codes** - Codes change at midnight IST
- 🌏 **IST Timezone Support** - Aligned with Indian Standard Time
- 📊 **Comprehensive Logging** - Tracks IP, device info, browser, OS, location
- 🚀 **Cloudflare Workers** - Fast, global edge deployment
- 💾 **D1 Database** - Built-in SQLite database for logs
- 📈 **Statistics API** - View verification stats and analytics

## API Endpoints

- `GET /` - API status and health check
- `POST /verify` - Verify a code
- `GET /logs` - View verification logs (with pagination)
- `GET /stats` - Get verification statistics
- `GET /today-code` - Get today's code (**Remove in production!**)

## Setup Instructions

### 1. Prerequisites

- Node.js (v16+)
- Cloudflare account
- Wrangler CLI

### 2. Install Dependencies

```bash
npm install
npm install -g wrangler
```

### 3. Login to Cloudflare

```bash
wrangler login
```

### 4. Create D1 Database

```bash
npm run db:create
```

Copy the `database_id` from the output and paste it in `wrangler.toml`

### 5. Initialize Database Schema

```bash
npm run db:init
```

### 6. Deploy

```bash
npm run deploy
```

## Configuration

### Change Secret Salt

Edit `src/index.js` and change the `SECRET_SALT` value:

```javascript
const SECRET_SALT = "Your-New-Secret-Salt-Here";
```

⚠️ **Important:** The same salt must be used in your Python script to generate matching codes.

## Usage

### Verify a Code

```bash
curl -X POST https://your-worker.workers.dev/verify \
  -H "Content-Type: application/json" \
  -d '{
    "code": "Xk7#mP9qL2@sN4vT",
    "deviceInfo": {
      "deviceType": "Desktop",
      "screenResolution": "1920x1080",
      "timezone": "Asia/Kolkata",
      "language": "en-US",
      "extensionVersion": "1.0.0"
    }
  }'
```

### View Logs

```bash
curl https://your-worker.workers.dev/logs?limit=10
```

### View Statistics

```bash
curl https://your-worker.workers.dev/stats
```

## Database Queries

```bash
# View all logs
wrangler d1 execute verification-logs --command="SELECT * FROM verification_logs ORDER BY timestamp DESC LIMIT 10"

# View successful verifications
wrangler d1 execute verification-logs --command="SELECT * FROM verification_logs WHERE success = 1"

# View by country
wrangler d1 execute verification-logs --command="SELECT * FROM verification_logs WHERE country = 'IN'"
```

## Python Code Generator

Use the included Python script to generate today's code:

```python
import hashlib
import hmac
from datetime import datetime
import pytz

SECRET_SALT = "Sk2024#Lx7Mq9Pv3Zt8Xw1Bn6Cr4Fy5Gh2Jk0Nl3"  # Same as in index.js

def generate_daily_code(date_string, secret_salt):
    message = f"{date_string}_{secret_salt}"
    hash_object = hmac.new(
        secret_salt.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    )
    hash_bytes = hash_object.digest()
    
    uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    lowercase = "abcdefghijklmnopqrstuvwxyz"
    numbers = "0123456789"
    symbols = "!@#$%&*+-="
    all_chars = uppercase + lowercase + numbers + symbols
    
    code = ""
    for i in range(16):
        char_index = hash_bytes[i % len(hash_bytes)] % len(all_chars)
        code += all_chars[char_index]
    
    # Ensure diversity
    if not any(c in uppercase for c in code):
        code = uppercase[hash_bytes[0] % len(uppercase)] + code[1:]
    if not any(c in lowercase for c in code):
        code = code[0] + lowercase[hash_bytes[1] % len(lowercase)] + code[2:]
    if not any(c in numbers for c in code):
        code = code[:2] + numbers[hash_bytes[2] % len(numbers)] + code[3:]
    if not any(c in symbols for c in code):
        code = code[:3] + symbols[hash_bytes[3] % len(symbols)] + code[4:]
    
    return code[:16]

ist = pytz.timezone('Asia/Kolkata')
current_date = datetime.now(ist)
date_string = current_date.strftime("%Y%m%d")
code = generate_daily_code(date_string, SECRET_SALT)
print(f"Today's code: {code}")
```

## Security Notes

⚠️ **Production Checklist:**

1. **Remove `/today-code` endpoint** from `src/index.js`
2. **Add authentication** to `/logs` and `/stats` endpoints
3. **Implement rate limiting** to prevent brute force attacks
4. **Change SECRET_SALT** to your own unique value
5. **Use environment variables** for sensitive data
6. **Enable HTTPS only** in production

## License

MIT
