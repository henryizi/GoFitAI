# Production Setup Guide

## 🚀 **For Published App (Production)**

When you publish your app, users will connect to your **production server**, not localhost. Here's how to set it up:

### **1. Set Production API URL**

In your environment variables (`.env` file), set:

```bash
EXPO_PUBLIC_API_URL=https://your-production-server.com
```

**Examples:**
- `https://api.snapbody.ai`
- `https://your-server.herokuapp.com`
- `https://your-domain.com/api`

### **2. Deploy Your Server**

Deploy your server to a hosting service like:
- **Heroku**
- **Railway**
- **DigitalOcean**
- **AWS**
- **Vercel** (for serverless)

### **3. Environment Variables for Production**

```bash
# Production API URL (REQUIRED for published app)
EXPO_PUBLIC_API_URL=https://your-production-server.com

# AI Service (OpenRouter)
EXPO_PUBLIC_DEEPSEEK_API_KEY=your_openrouter_api_key
EXPO_PUBLIC_DEEPSEEK_API_URL=https://openrouter.ai/api/v1/chat/completions
EXPO_PUBLIC_DEEPSEEK_MODEL=deepseek/deepseek-chat

# Supabase (Database)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔧 **Current Development vs Production**

### **Development (Local)**
- ✅ Tries localhost, 127.0.0.1:4000
- ✅ Shows connection errors (normal - server not running)
- ✅ Uses local development server

### **Production (Published)**
- ✅ Uses `EXPO_PUBLIC_API_URL` environment variable
- ✅ Connects to your production server
- ✅ No localhost fallbacks
- ✅ Users get proper functionality

## 📱 **What Users Will Experience**

### **With Production Server:**
- ✅ All features work normally
- ✅ AI workout plans generated
- ✅ Nutrition tracking
- ✅ Progress analytics
- ✅ No connection errors

### **Without Production Server:**
- ❌ Features that require AI won't work
- ❌ Users see error messages
- ❌ App becomes limited

## 🛠 **Quick Fix for Development**

If you want to test locally without the server running:

1. **Start the server:**
   ```bash
   cd server
   node start-server.js
   ```

2. **Or suppress alerts** (temporary):
   - The app will show a "Don't Show Again" option
   - This only affects development

## 🔍 **Testing Production Setup**

1. **Set your production URL:**
   ```bash
   EXPO_PUBLIC_API_URL=https://your-server.com
   ```

2. **Build for production:**
   ```bash
   npx expo build:android
   npx expo build:ios
   ```

3. **Test the build** - it should connect to your production server

## 📋 **Checklist for Production**

- [ ] Deploy server to hosting service
- [ ] Set `EXPO_PUBLIC_API_URL` to production URL
- [ ] Configure all environment variables
- [ ] Test production build
- [ ] Publish to app stores

---

**Note:** The connection errors you're seeing are **normal for development** and won't affect your published app as long as you set up the production API URL correctly.

