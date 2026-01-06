# 重置测试购买 - 清除未实际支付的购买记录

## 🔍 问题确认

从日志可以看到：
- ✅ 账户显示已拥有 `gofitai_premium_lifetime1` 产品
- ❌ 但实际上**没有支付**（这是 StoreKit 测试环境的购买）
- ⚠️ 购买日期：`2025-11-24T15:31:57Z`
- ⚠️ 这是测试购买，不是真实购买

## 🛠️ 解决方案

### 方法 1: 清除 StoreKit 测试交易（推荐）

这是最直接的方法，清除 Xcode StoreKit 配置中的测试交易：

1. **打开 Xcode**
   - 打开 `ios/GoFitAI.xcworkspace`

2. **打开 Scheme 编辑器**
   - 点击顶部 scheme 下拉菜单 → **"Edit Scheme..."**

3. **管理 StoreKit 交易**
   - 选择 **"Run"** → **"Options"** 标签
   - 在 **"StoreKit Configuration"** 部分
   - 点击 **"Manage StoreKit Transactions..."** 按钮

4. **删除测试交易**
   - 找到 `gofitai_premium_lifetime1` 的交易（日期：2025-11-24）
   - 选择它，点击 **"Delete"**
   - 或点击 **"Delete All"** 清除所有测试交易

5. **清理并重新运行**
   - **Product** → **Clean Build Folder** (Cmd+Shift+K)
   - **Product** → **Run** (Cmd+R)

### 方法 2: 重置模拟器（如果方法 1 不起作用）

1. **在 iOS 模拟器中**
   - 菜单：**Device** → **Erase All Content and Settings...**
   - 确认重置

2. **重新安装应用**
   - 在 Xcode 中重新运行应用

### 方法 3: 清除 RevenueCat 测试数据

如果购买记录也在 RevenueCat 中：

1. **登录 RevenueCat Dashboard**
   - 访问：https://app.revenuecat.com/
   - 选择 GoFitAI 项目

2. **查看客户**
   - 进入 **"Customers"** 标签
   - 搜索你的用户 ID 或匿名 ID
   - 找到测试购买记录

3. **删除测试客户数据**（如果需要）
   - 注意：这会影响所有测试数据
   - 建议只在开发环境中使用

### 方法 4: 使用全新的测试账户

如果上述方法都不行：

1. **创建新的 Apple ID**
   - 使用全新的测试账户登录应用
   - 这个账户不会有任何购买记录

2. **在应用中注册新账户**
   - 使用新邮箱注册
   - 这样就是完全干净的状态

## 📱 验证清除是否成功

清除后，重新运行应用：

1. **检查日志**，应该看到：
   ```
   [RevenueCat] 🔍 Ownership check (before purchase): {
     hasProduct: false,  // ✅ 应该是 false
     nonSubscriptionTransactions: []  // ✅ 应该是空数组
   }
   ```

2. **尝试购买**
   - 点击终身产品
   - 应该看到 Apple 支付界面弹出
   - 不会再有超时错误

## ⚠️ 重要提示

- **StoreKit 测试环境**：测试购买不会实际扣款
- **真实环境**：只有在 App Store 或 TestFlight 中的购买才会实际扣款
- **开发测试**：可以随时清除测试交易来重新测试

## 🔄 如果问题仍然存在

如果清除后仍然显示已拥有产品：

1. **检查是否在多个地方有记录**
   - StoreKit 配置
   - RevenueCat Dashboard
   - 应用本地缓存

2. **完全重置**
   - 重置模拟器
   - 清除应用数据
   - 重新安装应用

3. **使用新账户**
   - 创建全新的测试账户
   - 确保没有任何历史记录


