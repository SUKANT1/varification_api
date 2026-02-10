# Complete Setup Guide: GitHub to Cloudflare

## 📁 FILES YOU NEED TO CREATE

Your project folder should have this structure:

```
verification-api/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   └── index.js
├── .gitignore
├── package.json
├── README.md
├── schema.sql
├── show_today_code.py
└── wrangler.toml
```

All these files have been created for you in this chat. Download them all!

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### STEP 1: Download All Files

1. Download all the files I created above
2. Put them in a folder called `verification-api` on your computer
3. Make sure the folder structure matches exactly as shown above

### STEP 2: Install Requirements

Open terminal/command prompt in your `verification-api` folder:

```bash
# Install Node.js dependencies
npm install

# Install Wrangler globally
npm install -g wrangler
```

### STEP 3: Login to Cloudflare

```bash
wrangler login
```

This will open your browser - login to your Cloudflare account.

### STEP 4: Create D1 Database

```bash
wrangler d1 create verification-logs
```

You'll get output like:
```
[[d1_databases]]
binding = "DB"
database_name = "verification-logs"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**COPY THE DATABASE_ID!**

### STEP 5: Update wrangler.toml

Open `wrangler.toml` and replace `YOUR_DATABASE_ID_HERE` with the database_id from Step 4:

```toml
[[d1_databases]]
binding = "DB"
database_name = "verification-logs"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Your actual ID
```

### STEP 6: Initialize Database

```bash
wrangler d1 execute verification-logs --file=schema.sql
```

You should see: "🌀 Executed 4 commands"

### STEP 7: Test Locally (Optional)

```bash
npm run dev
```

Visit: http://localhost:8787/

### STEP 8: Upload to GitHub

#### Option A: Using GitHub Desktop (Easiest)

1. Download GitHub Desktop: https://desktop.github.com/
2. Install and login to GitHub
3. Click **File** → **New Repository**
4. **Local Path:** Choose your `verification-api` folder
5. **Name:** `verification-api`
6. Click **Create Repository**
7. Click **Publish repository**
8. Choose **Public** or **Private**
9. Click **Publish**

✅ Your code is now on GitHub!

#### Option B: Using Git Command Line

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repository on GitHub (you need GitHub CLI)
gh repo create verification-api --public --source=. --push
```

### STEP 9: Setup Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Click **Use template** next to "Edit Cloudflare Workers"
4. **Token name:** `GitHub Actions Deploy`
5. Click **Continue to summary**
6. Click **Create Token**
7. **COPY THE TOKEN** (you won't see it again!)

### STEP 10: Add Token to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name:** `CLOUDFLARE_API_TOKEN`
5. **Value:** Paste the token from Step 9
6. Click **Add secret**

### STEP 11: Deploy!

Now every time you push to GitHub, it will auto-deploy!

**Manual deploy:**
```bash
npm run deploy
```

**Or push to GitHub:**
```bash
git add .
git commit -m "Update code"
git push
```

GitHub Actions will automatically deploy to Cloudflare!

---

## 🔧 CUSTOMIZATION

### Change Your Secret Salt

Edit `src/index.js` (line 5):
```javascript
const SECRET_SALT = "Your-New-Secret-Here";
```

**ALSO UPDATE** `show_today_code.py` (line 41) with the SAME value!

### Use Your Own Domain

1. Go to Cloudflare Dashboard
2. Click **Workers & Pages**
3. Click your worker
4. Click **Settings** → **Triggers**
5. Click **Add Custom Domain**
6. Enter: `api.yourwebsite.com`
7. Click **Add Custom Domain**

Cloudflare automatically sets up DNS and SSL!

---

## 🧪 TESTING

### Get Today's Code

**Using Python:**
```bash
python show_today_code.py
```

**Using API:**
```bash
curl https://your-worker.workers.dev/today-code
```

### Test Verification

```bash
curl -X POST https://your-worker.workers.dev/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR_CODE_HERE"}'
```

### View Logs

```bash
curl https://your-worker.workers.dev/logs?limit=10
```

### View Stats

```bash
curl https://your-worker.workers.dev/stats
```

---

## 📱 EXTENSION SETUP

I'll provide the extension files separately!

---

## 🎯 WORKFLOW SUMMARY

```
1. Edit code locally
   ↓
2. Test with: npm run dev
   ↓
3. Commit: git add . && git commit -m "message"
   ↓
4. Push: git push
   ↓
5. GitHub Actions auto-deploys to Cloudflare!
   ↓
6. Your API is live! 🎉
```

---

## 🆘 TROUBLESHOOTING

**Error: "Database not found"**
- Run: `wrangler d1 create verification-logs`
- Update `database_id` in `wrangler.toml`
- Run: `wrangler d1 execute verification-logs --file=schema.sql`

**Error: "Unauthorized"**
- Run: `wrangler login` again
- Check your Cloudflare API token in GitHub Secrets

**GitHub Actions failing**
- Check the Actions tab in GitHub
- Make sure `CLOUDFLARE_API_TOKEN` is set correctly
- Make sure `database_id` is correct in `wrangler.toml`

---

## ✅ CHECKLIST

Before going live:

- [ ] Changed `SECRET_SALT` to your own value
- [ ] Updated `SECRET_SALT` in both `index.js` and `show_today_code.py`
- [ ] Removed or protected `/today-code` endpoint
- [ ] Added authentication to `/logs` and `/stats` endpoints
- [ ] Tested the API locally
- [ ] Tested verification with extension
- [ ] Database is created and initialized
- [ ] GitHub repository is created
- [ ] Cloudflare API token is added to GitHub Secrets
- [ ] Custom domain is configured (optional)

---

## 🎉 YOU'RE DONE!

Your verification API is now:
- ✅ Deployed on Cloudflare Workers
- ✅ Connected to GitHub for auto-deployment
- ✅ Logging all verification attempts
- ✅ Using IST timezone
- ✅ Generating daily codes

Next steps:
1. Create the browser extension
2. Test everything together
3. Go live!
