# Google Sign-In 配置指南

## 当前状态
✅ Google Sign-In 代码已实现
❌ Google OAuth 客户端 ID 未配置
❌ Supabase Google 提供商未启用

## 步骤 1: Google Cloud Console 配置

### 1.1 创建 Google Cloud 项目
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目 "GoFitAI"

### 1.2 启用必要的 API
1. 导航到 **APIs & Services → Library**
2. 搜索并启用以下 API:
   - **Google+ API** (已弃用但仍需要用于认证)
   - **Google Identity and Access Management (IAM) API**

### 1.3 创建 OAuth 2.0 凭据
1. 转到 **APIs & Services → Credentials**
2. 点击 **"Create Credentials" → "OAuth 2.0 Client IDs"**
3. 创建以下三种类型的凭据:

#### Web 应用程序凭据 (用于开发)
- **应用程序类型**: Web application
- **名称**: GoFitAI Web Client
- **授权重定向 URI**: 
  - `https://auth.expo.io/@your-expo-username/gofitai`
  - `https://lmfdgnxertwrhbjhrcby.supabase.co/auth/v1/callback`

#### iOS 应用程序凭据 (用于生产)
- **应用程序类型**: iOS
- **名称**: GoFitAI iOS Client  
- **Bundle ID**: `com.henrymadeit.gofitai`

#### Android 应用程序凭据 (用于生产)
- **应用程序类型**: Android
- **名称**: GoFitAI Android Client
- **包名**: `com.henrymadeit.gofitai`
- **SHA-1 证书指纹**: (稍后添加)

## 步骤 2: 获取客户端 ID

创建凭据后，你将获得:
- **Web Client ID**: `xxx-xxx.apps.googleusercontent.com`
- **iOS Client ID**: `xxx-xxx.apps.googleusercontent.com` 
- **Android Client ID**: `xxx-xxx.apps.googleusercontent.com`

## 步骤 3: 更新环境变量

在你的 `.env` 文件中添加:
```bash
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.googleusercontent.com
```

## 步骤 4: Supabase 配置

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 转到 **Authentication → Providers**
4. 启用 **Google** 提供商:
   - **Client ID**: 使用你的 Web Client ID
   - **Client Secret**: 从 Google Cloud Console 获取
   - **Redirect URL**: 复制提供的 URL 并添加到 Google Cloud Console

## 步骤 5: 测试配置

### 开发环境测试
```bash
# 重启开发服务器以加载新的环境变量
npx expo start --clear
```

### 验证步骤
1. 在应用中点击 "Sign in with Google"
2. 应该打开 Google 的 OAuth 流程
3. 登录后应该返回到应用
4. 检查 Supabase 仪表板中是否创建了用户

## 故障排除

### 常见问题
1. **"Google OAuth client ID not configured"**
   - 检查环境变量是否正确设置
   - 重启开发服务器

2. **"redirect_uri_mismatch"**
   - 确保 Google Cloud Console 中的重定向 URI 正确
   - 检查 Expo 用户名是否正确

3. **"invalid_client"**
   - 验证客户端 ID 是否正确
   - 确保 API 已启用

### 调试信息
当前应用配置:
- Bundle ID: `com.henrymadeit.gofitai`
- Expo Scheme: `exp+gofitai`
- Supabase URL: `https://lmfdgnxertwrhbjhrcby.supabase.co`

## 下一步
配置完成后，我们可以:
1. 测试 Google 登录功能
2. 完成 RevenueCat Dashboard 配置
3. 准备 TestFlight 构建




