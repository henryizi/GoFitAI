# Apple 支付界面未弹出 - 诊断指南

## 🔍 问题描述
点击终身购买后，Apple 支付界面没有弹出，但应用显示"Welcome to GoFitAI Premium"。

## 🚨 可能的原因

### 1. StoreKit 配置问题（最常见）
**症状**: `Purchases.purchasePackage()` 被调用，但 Apple 支付界面不显示

**检查步骤**:
1. 打开 Xcode 项目 (`ios/GoFitAI.xcworkspace`)
2. 检查 Scheme 配置：
   - 点击顶部 scheme 下拉菜单 → "Edit Scheme..."
   - 选择 "Run" → "Options" 标签
   - 查看 "StoreKit Configuration" 是否选择了 `GoFitAI.storekit`
   - 如果没有，选择它并保存

3. 检查 StoreKit 配置文件：
   - 在项目导航器中查找 `GoFitAI.storekit`
   - 打开文件，确认包含产品：
     - `gofitai_premium_lifetime1` (非消耗型产品)
     - `gofitai_premium_monthly1` (自动续订订阅)
     - `gofitai_premium_yearly1` (自动续订订阅)

### 2. 产品 ID 不匹配
**症状**: 代码中的产品 ID 与 StoreKit/App Store Connect 中的不匹配

**检查步骤**:
1. 查看代码中的产品 ID (`src/config/revenuecat.ts`):
   ```typescript
   lifetime: 'gofitai_premium_lifetime1'
   ```

2. 检查 StoreKit 配置文件中的产品 ID
3. 检查 App Store Connect 中的产品 ID（如果已配置）

**必须完全匹配！**

### 3. 测试环境问题
**症状**: 在模拟器或测试设备上，支付界面不显示

**解决方案**:
- **模拟器**: 确保使用 iOS 15.1+ 的模拟器
- **真机**: 确保使用测试账户登录 App Store
- **TestFlight**: 需要使用沙盒测试账户

### 4. RevenueCat 配置问题
**症状**: RevenueCat 没有正确识别产品

**检查步骤**:
1. 登录 RevenueCat Dashboard
2. 检查 Products 标签页：
   - 确认 `gofitai_premium_lifetime1` 存在
   - 确认产品类型是 "Non-Consumable"
3. 检查 Packages 标签页：
   - 确认有 lifetime package
   - 确认 package 链接到正确的产品
4. 检查 Offerings 标签页：
   - 确认 default offering 包含 lifetime package

### 5. 代码逻辑问题
**症状**: 所有权检查错误地阻止了购买

**检查日志**:
查看控制台日志，查找：
```
[RevenueCat] 🔍 Ownership check (before purchase)
[RevenueCat] ⚠️ User already owns this lifetime product
```

如果看到这个警告，说明代码认为用户已经拥有产品，所以不会显示支付界面。

**解决方案**:
- 如果是新账户，这可能是 RevenueCat 同步问题
- 尝试清除应用数据并重新登录
- 或者在 RevenueCat Dashboard 中清除测试数据

## 🔧 诊断步骤

### Step 1: 检查日志
运行应用并尝试购买，查看控制台日志：

```
[RevenueCat] 💳 Calling Purchases.purchasePackage() - Apple payment sheet should appear now
[RevenueCat] 💳 Package validation: {...}
[RevenueCat] 💳 About to call Purchases.purchasePackage()...
```

**如果看到这些日志但没有支付界面**:
- 问题在 StoreKit 配置或产品 ID

**如果没有看到这些日志**:
- 问题在代码逻辑（可能在所有权检查时返回了）

### Step 2: 验证 StoreKit 配置
1. 在 Xcode 中打开项目
2. 检查 Scheme → Run → Options → StoreKit Configuration
3. 确认选择了正确的 `.storekit` 文件

### Step 3: 验证产品 ID
1. 打开 `GoFitAI.storekit` 文件
2. 确认产品 ID 是 `gofitai_premium_lifetime1`
3. 确认产品类型是 "Non-Consumable"

### Step 4: 测试购买流程
1. 清理项目 (Cmd+Shift+K)
2. 重新构建 (Cmd+R)
3. 尝试购买
4. 查看日志输出

## 🎯 快速修复

### 如果 StoreKit 配置缺失：
1. 在 Xcode 中：Product → Scheme → Edit Scheme
2. Run → Options → StoreKit Configuration
3. 选择 `GoFitAI.storekit`
4. 保存并重新运行

### 如果产品 ID 不匹配：
1. 检查 `src/config/revenuecat.ts` 中的产品 ID
2. 检查 `GoFitAI.storekit` 中的产品 ID
3. 确保完全匹配

### 如果是所有权检查问题：
查看日志中的所有权检查结果。如果是新账户但显示已拥有，可能是：
- RevenueCat 测试数据残留
- StoreKit 测试数据残留

**解决方案**: 清除应用数据或使用全新的测试账户

## 📱 测试建议

1. **使用全新的测试账户**（避免之前的测试数据干扰）
2. **在真机上测试**（模拟器有时有 StoreKit 问题）
3. **检查 Xcode 控制台日志**（查看详细的调试信息）
4. **确认 StoreKit 配置已选择**（这是最常见的问题）

## 🚨 如果问题仍然存在

请提供以下信息：
1. Xcode 控制台的完整日志（从点击购买到显示结果）
2. StoreKit 配置文件的截图
3. Scheme 配置的截图（Run → Options）
4. 使用的测试环境（模拟器/真机/TestFlight）


