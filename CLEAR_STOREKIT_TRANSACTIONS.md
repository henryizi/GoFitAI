# 清除 StoreKit 测试交易 - 解决支付界面不显示问题

## 🔍 问题诊断

从日志可以看到：
- ✅ 代码正确调用了 `Purchases.purchasePackage()`
- ❌ 30秒后超时，Apple 支付界面没有弹出
- ⚠️ 用户已经拥有产品（从 `2025-11-24T15:31:57Z` 的测试购买）

**根本原因**：Apple StoreKit 检测到用户已经拥有这个非消耗型产品，所以不会显示支付界面。这是 Apple 的正常行为。

## 🛠️ 解决方案

### 方法 1: 在 Xcode 中清除 StoreKit 交易（推荐）

1. **打开 Xcode 项目**
   - 打开 `ios/GoFitAI.xcworkspace`

2. **打开 Scheme 编辑器**
   - 点击顶部工具栏的 scheme 下拉菜单（显示 "GoFitAI"）
   - 选择 **"Edit Scheme..."**

3. **管理 StoreKit 交易**
   - 左侧选择 **"Run"**
   - 点击 **"Options"** 标签
   - 在 **"StoreKit Configuration"** 部分
   - 点击 **"Manage StoreKit Transactions..."** 按钮

4. **删除测试交易**
   - 在弹出窗口中，你会看到所有测试交易
   - 找到 `gofitai_premium_lifetime1` 的交易
   - 选择它，然后点击 **"Delete"** 按钮
   - 或者点击 **"Delete All"** 清除所有测试交易

5. **保存并重新运行**
   - 关闭窗口
   - 清理项目：**Product** → **Clean Build Folder** (Cmd+Shift+K)
   - 重新运行应用：**Product** → **Run** (Cmd+R)

### 方法 2: 重置 iOS 模拟器

如果方法 1 不起作用：

1. **在 iOS 模拟器中**
   - 菜单：**Device** → **Erase All Content and Settings...**
   - 确认重置

2. **重新安装应用**
   - 在 Xcode 中重新运行应用
   - 这会清除所有模拟器数据，包括 StoreKit 测试交易

### 方法 3: 使用全新的测试账户

如果上述方法都不行：

1. **创建新的 Apple ID**
   - 使用全新的测试账户登录应用
   - 这个账户不会有之前的购买记录

2. **在 Xcode 中切换测试账户**
   - **Product** → **Scheme** → **Edit Scheme...**
   - **Run** → **Options** → **StoreKit Configuration**
   - 确保选择了正确的 StoreKit 配置文件

## 📱 验证步骤

清除交易后：

1. **重新运行应用**
2. **尝试购买终身产品**
3. **应该看到**：
   ```
   [RevenueCat] ✅ Product not owned, proceeding with purchase
   [RevenueCat] 💳 Calling Purchases.purchasePackage() - Apple payment sheet should appear now
   ```
4. **Apple 支付界面应该立即弹出**

## ⚠️ 重要提示

- **开发环境**：可以清除测试交易来重新测试
- **生产环境**：用户已经拥有的产品不会再次显示支付界面（这是 Apple 的保护机制）
- **测试建议**：每次测试购买流程时，使用全新的测试账户或清除测试交易

## 🔄 如果问题仍然存在

如果清除交易后仍然超时：

1. **检查 StoreKit 配置**
   - 确认 `GoFitAI.storekit` 文件存在
   - 确认 Scheme 中选择了正确的 StoreKit 配置

2. **检查产品 ID**
   - 确认 `gofitai_premium_lifetime1` 在 StoreKit 配置中存在
   - 确认产品类型是 "Non-Consumable"

3. **重启 Xcode 和模拟器**
   - 完全关闭 Xcode
   - 重启模拟器
   - 重新打开项目

4. **检查 RevenueCat 配置**
   - 确认 RevenueCat Dashboard 中产品配置正确
   - 确认 API key 正确


