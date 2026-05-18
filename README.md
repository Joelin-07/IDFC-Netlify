# Analytics Portal v2 — Setup Guide

## Folder structure

```
netlify-dashboard-site-v2/
├── index.html                   ← Login page (username + password)
├── dashboard.html               ← Protected dashboard (Looker Studio embed)
├── _redirects                   ← Netlify routing rules
├── netlify.toml                 ← Build config + security headers
└── netlify/
    └── functions/
        ├── login.js             ← Verifies credentials (server-side only)
        └── verify.js            ← Validates session token on dashboard load
```

---

## How credentials are handled (important to understand)

```
Your HTML/JS files      →  zero credentials stored here
Netlify env var vault   →  PORTAL_USERNAME, PORTAL_PASSWORD, SESSION_SECRET
                              ↓ only readable by your Netlify Functions
login.js (server-side)  →  reads env vars, compares securely, issues signed token
Browser sessionStorage  →  stores the token (NOT the password)
verify.js (server-side) →  validates token on every dashboard load
```

Nobody looking at your HTML source, browser DevTools, or network tab will ever see your password.

---

## Step 1 — Set environment variables in Netlify

Go to: **Netlify dashboard → Site configuration → Environment variables → Add variable**

| Variable name     | Value                          |
|-------------------|-------------------------------|
| `PORTAL_USERNAME` | your chosen username           |
| `PORTAL_PASSWORD` | your chosen password           |
| `SESSION_SECRET`  | long random string (see below) |

Generate SESSION_SECRET (run this in terminal):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Example output: `a3f8c2d1e4b7...` — paste that as SESSION_SECRET.

**Never put these values in your code files.**

---

## Step 2 — Add your Looker Studio embed URL

In `dashboard.html`, replace:
```
src="REPLACE_WITH_YOUR_LOOKER_STUDIO_EMBED_URL"
```
with your actual embed URL from:
**Looker Studio → Share → Embed report → copy src URL**

---

## Step 3 — Deploy to Netlify

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git push -u origin main

# 2. In Netlify UI:
#    Add new site → Import from GitHub → select repo
#    Build command: (leave empty)
#    Publish directory: .
#    Click Deploy
```

Netlify auto-detects `netlify/functions/` and deploys your functions.

---

## Step 4 — Test it

1. Visit your Netlify URL → you see the login page
2. Enter your username + password → redirected to dashboard
3. Refresh the page → still on dashboard (session persists)
4. Click Sign out → back to login
5. Try visiting `/dashboard.html` directly without logging in → redirected to login

---

## Session behaviour

- Session lasts **8 hours** (set in `login.js` — change the `8` to any number)
- Stored in `sessionStorage` → clears when browser tab/window is closed
- To make it persist across browser restarts, change `sessionStorage` to `localStorage` in both HTML files
- Every dashboard load calls `verify.js` to confirm token is valid + not expired

---

## Changing the password

1. Go to Netlify → Environment variables
2. Update `PORTAL_PASSWORD` (and optionally `PORTAL_USERNAME`)
3. Redeploy (Netlify auto-redeploys on env var change, or push a commit)
4. Old sessions using the previous token will expire naturally within 8 hours,
   or you can change `SESSION_SECRET` to immediately invalidate all sessions
