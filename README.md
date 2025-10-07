# GoFitAI

**🟢 PRODUCTION LIVE** | [API](https://gofitai-production.up.railway.app) | [Quick Start](./QUICK_START.md) | [Documentation](./DOCS_INDEX.md)

A mobile fitness application built with React Native and Expo that uses AI to create personalized workout plans and nutrition tracking.

## 🎉 Now Live on Railway!

✅ Production server deployed and operational  
✅ Gemini AI integration for food analysis  
✅ Supabase database connected  
✅ Automated health checks  
✅ Complete documentation  

**Quick Start**: `npm run expo:start` to launch the app  
**Check Status**: `npm run check-deployment` to verify server health

---

## ✨ Features

- 🤖 **AI-powered workout plan generation** - Personalized fitness plans
- 📊 **Workout tracking and history** - Complete exercise logging and progress monitoring
- 🥗 **Nutrition planning** - Gemini Vision AI for food analysis
- 📈 **Progress tracking** - Body measurements, photos, and performance metrics
- 🖼️ **Food photo analysis** - Upload photos for instant nutritional analysis via Gemini AI
- 💪 **Bodybuilding specialization** - Expert-level training routines
- 🎯 **Daily metrics tracking** - Weight, calories, macros, and more

## 🏗️ Project Structure

```
GoFitAI/
├── 📱 app/                    # React Native app (Expo)
├── 🖥️ server/                 # Node.js backend server
├── 📚 docs/                   # Documentation (organized by category)
│   ├── setup/                # Installation & deployment guides
│   ├── features/             # Feature documentation
│   ├── fixes/                # Bug fixes & troubleshooting
│   └── migration/            # Database migrations
├── 🛠️ scripts/               # Utility scripts
│   ├── database/             # SQL migrations & DB tools
│   ├── deployment/           # Deployment scripts
│   └── tests/                # Test utilities
├── 🧪 tests/                 # Test suites
├── 📦 assets/                # Images, icons, videos
├── 🔧 temp/                  # Temporary files (safe to clean)
└── ⚙️ Config files           # package.json, app.json, etc.
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Expo Go app (for mobile testing)

### Quick Start

```bash
# Install dependencies
npm install

# Start the mobile app (connects to production Railway server)
npm run expo:start

# Check deployment status
npm run check-deployment

# View production logs
npm run railway:logs
```

### Running on Your Device

**iOS Simulator:**
```bash
npm run expo:ios
```

**Android Emulator:**
```bash
npm run expo:android
```

**Physical Device:**
1. Install "Expo Go" from App Store or Google Play
2. Scan the QR code from the terminal

### 📚 Documentation

New to the project? Check out these guides:

- **[QUICK_START.md](./QUICK_START.md)** - Get started in minutes
- **[README_DEPLOYMENT.md](./README_DEPLOYMENT.md)** - Complete deployment guide
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current status and metrics
- **[DOCS_INDEX.md](./DOCS_INDEX.md)** - Full documentation index

## 💻 Development

### Architecture

- **Frontend**: React Native + Expo
- **Backend**: Express.js on Railway
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini Vision (gemini-2.5-flash)

### Project Structure

```
app/              # Expo Router app files
src/              # React Native source
├── components/   # Reusable components
├── services/     # API services
├── hooks/        # Custom React hooks
├── config/       # Configuration
└── utils/        # Utility functions
server/           # Express backend
scripts/          # Utility scripts
docs/             # Documentation
```

### Available Scripts

```bash
# Mobile App
npm run expo:start       # Start Expo dev server
npm run expo:ios         # Run on iOS
npm run expo:android     # Run on Android

# Backend (Railway)
npm run check-deployment # Health check
npm run railway:logs     # View logs
npm run railway:status   # Check status
npm run railway:deploy   # Manual deploy

# Local Server (for development)
npm run start            # Start local server
npm run dev              # Start with nodemon
```

## 🔧 Troubleshooting

### App can't connect to server
```bash
# Check server health
npm run check-deployment

# View logs
npm run railway:logs
```

### Food analysis not working
- Check Gemini API quota in Google Cloud Console
- Verify environment variables on Railway

### Database issues
- Check Supabase dashboard
- Verify credentials in Railway environment variables

**For detailed troubleshooting**, see [README_DEPLOYMENT.md](./README_DEPLOYMENT.md#-troubleshooting)

## 📊 Monitoring

```bash
# Quick health check
npm run check-deployment

# View real-time logs
npm run railway:logs

# Check API directly
curl https://gofitai-production.up.railway.app/api/health
```

## 🔄 Deploying Updates

```bash
# Commit changes
git add .
git commit -m "Your update message"

# Push to deploy (Railway auto-deploys)
git push origin main

# Verify deployment
npm run check-deployment
```

## License

This project is proprietary software.
# Redeploy trigger Fri Aug 22 14:53:19 HKT 2025
# Force redeploy Sun Sep 14 22:43:04 HKT 2025
