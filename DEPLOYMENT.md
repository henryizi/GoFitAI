# 🚀 GoFitAI Deployment Guide

This guide explains how to deploy your GoFitAI app for both development and production environments.

## 🌍 Environment Overview

Your app now automatically handles two environments:

- **🔧 Development**: Uses your local server at `192.168.0.199:4000`
- **🚀 Production**: Uses your Railway server at `https://gofitai-production.up.railway.app`

## 📁 Environment Files

- `.env` - Current active environment (auto-switches based on build type)
- `.env.development` - Development configuration (local server)
- `.env.production` - Production configuration (Railway server)
- `env.production.example` - Template for production configuration

## 🛠️ Quick Commands

### Check Current Environment
```bash
./scripts/deploy.sh status
```

### Switch to Development
```bash
./scripts/deploy.sh development
```

### Switch to Production
```bash
./scripts/deploy.sh production
```

### Create Production Environment File
```bash
./scripts/deploy.sh create-prod
```

### Build for Production
```bash
./scripts/deploy.sh build
```

## 🔄 How Environment Switching Works

### Automatic Detection
The app automatically detects the environment using Expo's `__DEV__` flag:

- **Development Build** (`expo start`): Uses local server
- **Production Build** (`expo export`): Uses Railway server

### Manual Override
You can manually override by setting `EXPO_PUBLIC_API_URL` in your `.env` file.

## 📱 Development Workflow

1. **Start Development Server**
   ```bash
   cd server
   npm start
   ```

2. **Switch to Development Environment**
   ```bash
   ./scripts/deploy.sh development
   ```

3. **Start Expo App**
   ```bash
   npx expo start
   ```

4. **Test with Local Server**
   - App will connect to `192.168.0.199:4000`
   - Faster response times for development
   - Real-time testing of server changes

## 🚀 Production Deployment

### 1. Prepare Production Environment
```bash
# Create production environment file
./scripts/deploy.sh create-prod

# Edit .env.production with your production values
nano .env.production
```

### 2. Switch to Production
```bash
./scripts/deploy.sh production
```

### 3. Build Production Bundle
```bash
./scripts/deploy.sh build
```

### 4. Deploy
The `dist/` folder contains your production-ready app that can be deployed to:
- App Store / Google Play Store
- Web hosting platforms
- EAS Build for Expo

## 🔧 Environment Configuration

### Development (.env.development)
```bash
# Local API Server
EXPO_PUBLIC_API_URL=http://192.168.0.199:4000
NGROK_AUTHTOKEN=your_ngrok_authtoken_here

# Other development-specific settings...
```

### Production (.env.production)
```bash
# Production API Server
EXPO_PUBLIC_API_URL=https://gofitai-production.up.railway.app

# Production-specific settings...
# (No local server URLs)
```

## 🚨 Important Notes

### For Development
- ✅ Use local server for faster iteration
- ✅ Test AI features locally
- ✅ Real-time debugging

### For Production
- ❌ Never include local server URLs
- ✅ Use Railway server for reliability
- ✅ Ensure all production API keys are set
- ✅ Test thoroughly before deployment

## 🔍 Troubleshooting

### App Still Connecting to Wrong Server
1. Check current environment: `./scripts/deploy.sh status`
2. Restart Expo app after environment switch
3. Clear Expo cache: `npx expo start --clear`

### Production Build Issues
1. Ensure you're in production mode: `./scripts/deploy.sh production`
2. Check `.env.production` has correct values
3. Verify Railway server is accessible

### Local Server Not Accessible
1. Check server is running: `cd server && npm start`
2. Verify IP address: `ifconfig` or `ip addr`
3. Check firewall settings

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] Environment switched to production: `./scripts/deploy.sh production`
- [ ] All production API keys configured
- [ ] Railway server tested and accessible
- [ ] App functionality verified in production mode
- [ ] Production build successful: `./scripts/deploy.sh build`
- [ ] App Store / Play Store assets ready

## 🎯 Best Practices

1. **Always use the deployment script** instead of manually editing `.env`
2. **Test in production mode** before actual deployment
3. **Keep development and production configs separate**
4. **Use environment detection** in your code (already implemented)
5. **Document any environment-specific changes**

## 🆘 Need Help?

If you encounter issues:

1. Check the current environment: `./scripts/deploy.sh status`
2. Verify server connectivity
3. Check console logs for connection errors
4. Ensure all environment files are properly configured

---

**Happy Deploying! 🚀**


