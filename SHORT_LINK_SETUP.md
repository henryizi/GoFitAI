# Short Link Setup Guide for GoFitAI

## Option 1: Custom Domain Short Link (Recommended)

To create a link like `go.gofitai.link/app` or `gofitai.link/app`:

### Step 1: Register a Domain
- Register a domain like `gofitai.link` or `gofitai.app` (check availability)
- Popular registrars: Namecheap, Google Domains, Cloudflare

### Step 2: Set Up Hosting
You can use one of these services:

#### A. GitHub Pages (Free)
1. Create a repository: `gofitai-link` or similar
2. Upload `redirect.html` and rename it to `index.html`
3. Enable GitHub Pages in repository settings
4. Add custom domain: `go.gofitai.link` (requires DNS setup)
5. Your link will be: `go.gofitai.link` → redirects to App Store

#### B. Netlify (Free)
1. Sign up at [netlify.com](https://netlify.com)
2. Drag & drop the `redirect.html` file
3. Add custom domain: `go.gofitai.link`
4. Configure redirect in `_redirects` file:
   ```
   /app https://apps.apple.com/us/app/gofitai/id6752763510 301
   /tiktok https://apps.apple.com/us/app/gofitai/id6752763510 301
   ```

#### C. Vercel (Free)
1. Sign up at [vercel.com](https://vercel.com)
2. Import your project
3. Add custom domain
4. Configure redirects in `vercel.json`:
   ```json
   {
     "redirects": [
       {
         "source": "/app",
         "destination": "https://apps.apple.com/us/app/gofitai/id6752763510",
         "permanent": true
       },
       {
         "source": "/tiktok",
         "destination": "https://apps.apple.com/us/app/gofitai/id6752763510",
         "permanent": true
       }
     ]
   }
   ```

---

## Option 2: URL Shortener Services

### A. Bitly (Free tier available)
1. Sign up at [bitly.com](https://bitly.com)
2. Create short link: `bit.ly/gofitai-app`
3. Custom domain available on paid plans

### B. Rebrandly (Free tier available)
1. Sign up at [rebrandly.com](https://rebrandly.com)
2. Create branded short link
3. Custom domain available

### C. Short.io (Free tier available)
1. Sign up at [short.io](https://short.io)
2. Create short link with custom domain option

---

## Option 3: Quick Setup with Existing GitHub Pages

If you already have GitHub Pages set up (like your privacy policy):

1. **Add redirect file to your existing repo:**
   - Upload `redirect.html` to your `gofitai-privacy` repository
   - Rename to `app.html` or `download.html`

2. **Your link will be:**
   - `https://henryizi.github.io/gofitai-privacy/app.html`
   - Or if you have custom domain: `yourdomain.com/app`

3. **For multiple paths, create:**
   - `app.html` → App Store
   - `tiktok.html` → App Store (for TikTok)
   - `instagram.html` → App Store (for Instagram)

---

## Recommended: Netlify with Custom Domain

**Easiest setup for multiple short links:**

1. **Create `_redirects` file:**
   ```
   /app https://apps.apple.com/us/app/gofitai/id6752763510 301
   /tiktok https://apps.apple.com/us/app/gofitai/id6752763510 301
   /ig https://apps.apple.com/us/app/gofitai/id6752763510 301
   /download https://apps.apple.com/us/app/gofitai/id6752763510 301
   ```

2. **Deploy to Netlify:**
   - Drag & drop folder containing `_redirects` file
   - Add custom domain: `go.gofitai.link`
   - Done! Now you have:
     - `go.gofitai.link/app`
     - `go.gofitai.link/tiktok`
     - `go.gofitai.link/ig`

---

## Quick Start (5 minutes)

**Using Netlify (Recommended):**

1. Create a folder with `_redirects` file:
   ```
   /app https://apps.apple.com/us/app/gofitai/id6752763510 301
   /tiktok https://apps.apple.com/us/app/gofitai/id6752763510 301
   ```

2. Go to [netlify.com](https://netlify.com) → Sign up (free)

3. Drag & drop the folder

4. Your link: `https://random-name-123.netlify.app/app`

5. (Optional) Add custom domain in Netlify settings

---

## Example Links You Can Create

- `go.gofitai.link/app` → App Store
- `go.gofitai.link/tiktok` → App Store (for TikTok)
- `go.gofitai.link/ig` → App Store (for Instagram)
- `go.gofitai.link/fb` → App Store (for Facebook)
- `go.gofitai.link/yt` → App Store (for YouTube)

All redirect to: `https://apps.apple.com/us/app/gofitai/id6752763510`






