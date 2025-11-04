# TestFlight 订阅测试完整指南

## 🎯 TestFlight vs StoreKit Configuration

### ❌ 常见误解
"使用 TestFlight 就不需要 StoreKit Configuration"

### ✅ 正确理解
**两者都需要，用于不同的测试阶段！**

## 📋 完整配置清单

### 1. 开发阶段 (本地测试)
- ✅ **StoreKit Configuration** (`GoFitAI.storekit`)
- ✅ **RevenueCat Dashboard** 配置
- 🎯 **用途**: 在模拟器/开发设备上测试购买流程

### 2. TestFlight 阶段 (真实测试)
- ✅ **App Store Connect** 中的真实产品
- ✅ **RevenueCat Dashboard** 配置 (同一套)
- ✅ **TestFlight 构建**
- 🎯 **用途**: 真实用户测试，真实支付流程

## 🛠️ 当前状态检查

### 已完成 ✅
1. StoreKit Configuration 文件已创建
2. RevenueCat 服务已配置

### 待完成 ❌
1. **RevenueCat Dashboard Packages 配置** (关键!)
2. App Store Connect 产品配置 (用于 TestFlight)

## 🚀 TestFlight 测试步骤

### Step 1: 完成 RevenueCat Dashboard 配置
按照 `REVENUECAT_PACKAGE_SETUP.md` 完成配置

### Step 2: App Store Connect 产品配置
1. 登录 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择你的应用
3. 进入 **"App 内购买项目"**
4. 创建订阅产品：
   - **产品 ID**: `gofitai_premium_monthly1`
   - **类型**: 自动续订订阅
   - **订阅群组**: 创建新群组
   - **价格**: 设置价格层级

5. 创建终身产品：
   - **产品 ID**: `gofitai_premium_lifetime1`
   - **类型**: 非消耗型产品
   - **价格**: 设置价格层级

### Step 3: 提交审核
1. 产品创建后需要提交审核
2. 审核通过后才能在 TestFlight 中测试

### Step 4: TestFlight 构建
```bash
# 构建 TestFlight 版本
npx eas build --platform ios --profile preview
```

### Step 5: TestFlight 测试
1. 上传构建到 TestFlight
2. 邀请测试用户
3. 测试真实购买流程

## 🔍 测试环境对比

| 测试环境 | StoreKit Config | App Store Connect | RevenueCat | 支付 |
|---------|----------------|-------------------|------------|------|
| **本地开发** | ✅ 需要 | ❌ 不需要 | ✅ 需要 | 🎭 模拟 |
| **TestFlight** | ✅ 需要* | ✅ 需要 | ✅ 需要 | 💳 真实 |
| **App Store** | ❌ 不需要 | ✅ 需要 | ✅ 需要 | 💳 真实 |

*StoreKit Config 在 TestFlight 中不会被使用，但开发期间仍需要

## 🚨 重要提醒

### TestFlight 订阅测试特点：
1. **真实支付**: TestFlight 中的订阅是真实收费的！
2. **沙盒账户**: 需要使用 App Store Connect 沙盒测试账户
3. **产品审核**: App Store Connect 中的产品需要先通过审核

### 推荐测试流程：
1. **先用 StoreKit Config 本地测试** (免费，快速)
2. **再用 TestFlight 测试** (真实环境)
3. **最后发布到 App Store**

## 🎯 下一步行动

1. **立即**: 完成 RevenueCat Dashboard 配置
2. **然后**: 在本地用 StoreKit Config 测试
3. **最后**: 配置 App Store Connect 产品用于 TestFlight




