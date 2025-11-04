# RevenueCat Package 配置指南

## 🚨 当前问题
- StoreKit 产品已识别：`gofitai_premium_monthly1`, `gofitai_premium_lifetime1`
- 但 RevenueCat 报错："Couldn't find package"
- **原因：RevenueCat Dashboard 中没有配置 Packages**

## 🛠️ 解决步骤

### 1. 登录 RevenueCat Dashboard
访问：https://app.revenuecat.com/

### 2. 进入你的项目
选择 GoFitAI 项目

### 3. 配置 Packages
1. 在左侧菜单中点击 **"Products"**
2. 确认你的产品已存在：
   - `gofitai_premium_monthly1`
   - `gofitai_premium_lifetime1`

### 4. 创建 Packages
1. 点击 **"Packages"** 标签页
2. 点击 **"+ New Package"**

#### 创建月度 Package：
- **Package ID**: `monthly_premium`
- **Product**: 选择 `gofitai_premium_monthly1`
- **Package Type**: `Monthly`

#### 创建终身 Package：
- **Package ID**: `lifetime_premium`  
- **Product**: 选择 `gofitai_premium_lifetime1`
- **Package Type**: `Lifetime`

### 5. 配置 Offerings
1. 在左侧菜单中点击 **"Offerings"**
2. 编辑 **"default"** offering
3. 添加刚创建的 packages：
   - `monthly_premium`
   - `lifetime_premium`

### 6. 保存并测试
1. 保存所有配置
2. 重启应用
3. 测试付费墙功能

## 🔍 验证步骤
应用重启后，日志应该显示：
```
✅ Offerings loaded successfully
✅ Found packages: monthly_premium, lifetime_premium
✅ No more "Couldn't find package" errors
```

## 📱 测试购买流程
1. 打开付费墙
2. 选择套餐
3. 点击购买按钮
4. 应该弹出 StoreKit 购买界面（模拟器中）

## 🚨 重要提醒
- 确保 Package IDs 与代码中的查找逻辑匹配
- 月度包应该包含 "monthly" 关键词
- 终身包应该包含 "lifetime" 关键词




