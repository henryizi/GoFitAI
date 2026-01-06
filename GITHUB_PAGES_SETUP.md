# GitHub Pages Setup for Support Files

**Critical:** This must be done before resubmitting to App Store!

---

## 📋 Quick Setup (5 Minutes)

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `gofitai-support`
3. Description: "GoFitAI Support Documentation"
4. Set to **Public** (required for GitHub Pages)
5. Click "Create repository"

### Step 2: Upload Files
1. In your new repository, click "Add file" → "Upload files"
2. Drag and drop these 3 files from your GoFitAI project:
   - `privacy-policy.html`
   - `support.html`
   - `terms-of-service.html`
3. Add commit message: "Add support documentation"
4. Click "Commit changes"

### Step 3: Enable GitHub Pages
1. In your repository, click "Settings" tab
2. Scroll down to "Pages" in left sidebar
3. Under "Source", select:
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
4. Click "Save"
5. Wait 2-3 minutes for deployment

### Step 4: Verify URLs Work
Visit these URLs to confirm they load:
- https://henryizi.github.io/gofitai-support/privacy-policy.html
- https://henryizi.github.io/gofitai-support/support.html
- https://henryizi.github.io/gofitai-support/terms-of-service.html

✅ If all 3 pages load, you're done!

---

## 🔗 URLs Used in App

The app links to these URLs:
```
Privacy Policy:
https://henryizi.github.io/gofitai-support/privacy-policy.html

Terms of Service:
https://henryizi.github.io/gofitai-support/terms-of-service.html

Support:
https://henryizi.github.io/gofitai-support/support.html
```

---

## 📱 Where These Links Appear in App

1. **Paywall Screen** (bottom):
   - Terms of Service
   - Privacy Policy

2. **Registration Screen** (footer):
   - Terms of Service
   - Privacy Policy

3. **Settings → Privacy & Security**:
   - Privacy Policy
   - Terms of Service

---

## 🐛 Troubleshooting

### "404 Page Not Found"
- Wait 5 minutes - GitHub Pages can take time to deploy
- Check repository is set to **Public**
- Verify branch name is correct in Pages settings
- Ensure files are in root directory (not in a subfolder)

### "Repository not found"
- Make sure repository name is exactly: `gofitai-support`
- Check your GitHub username is `henryizi`
- Verify repository is Public

### "Files not showing"
- Refresh GitHub Pages settings
- Check files were uploaded successfully
- Look in repository's "Code" tab to see files

---

## 📸 Visual Guide

### Step 1: New Repository
```
Repository name: gofitai-support
Description: GoFitAI Support Documentation
Public: ✓ Selected
□ Add README
□ Add .gitignore
□ Choose a license

[Create repository]
```

### Step 2: Upload Files
```
[Add file ▼] → [Upload files]

Drag files here or choose your files:
✓ privacy-policy.html
✓ support.html  
✓ terms-of-service.html

Commit message: Add support documentation

[Commit changes]
```

### Step 3: GitHub Pages Settings
```
Settings → Pages

Source:
Branch: main ▼
Folder: / (root) ▼
[Save]

✅ Your site is published at:
   https://henryizi.github.io/gofitai-support/
```

---

## ✅ Success Checklist

- [ ] Repository created: `gofitai-support`
- [ ] Repository is Public
- [ ] 3 files uploaded (privacy-policy, support, terms-of-service)
- [ ] GitHub Pages enabled (main branch, root folder)
- [ ] Waited 2-5 minutes for deployment
- [ ] All 3 URLs load successfully
- [ ] No 404 errors
- [ ] Files display correctly

---

## 🚀 After GitHub Pages is Live

### Update App Store Connect
1. Go to App Store Connect
2. Your App → App Information
3. Update Support URL to: `https://henryizi.github.io/gofitai-support/support.html`
4. Update Privacy Policy URL: `https://henryizi.github.io/gofitai-support/privacy-policy.html`
5. Save changes

### Test in App
1. Open GoFitAI app
2. Go to registration screen
3. Click "Terms of Service" - should open in browser
4. Click "Privacy Policy" - should open in browser
5. Go to Settings → Privacy & Security
6. Test links there too

---

## 📝 Alternative Hosting (If GitHub Pages Fails)

If GitHub Pages doesn't work for some reason, you can use:

### Netlify Drop (Easy)
1. Go to https://app.netlify.com/drop
2. Drag your 3 HTML files
3. Get URL like: `https://random-name.netlify.app/`
4. Update app links to use this URL

### Vercel (Easy)
1. Go to https://vercel.com
2. Sign in with GitHub
3. Import `gofitai-support` repository
4. Deploy
5. Get URL like: `https://gofitai-support.vercel.app/`

---

## 💡 Tips

- Keep repository Public (required for free GitHub Pages)
- Don't add .gitignore or README (not needed)
- Files must be exactly named as shown
- URLs are case-sensitive
- Allow 2-5 minutes for initial deployment

---

## 📞 Need Help?

If GitHub Pages isn't working after 10 minutes:
1. Check repository is Public
2. Verify files are in root (not in a folder)
3. Try disabling and re-enabling Pages
4. Check GitHub Status: https://www.githubstatus.com/
5. Contact: henry983690@gmail.com

---

**Once GitHub Pages is live, you're ready to resubmit to App Store!** 🎉















