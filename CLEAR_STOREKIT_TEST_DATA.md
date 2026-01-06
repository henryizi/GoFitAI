# 清除 StoreKit 测试数据指南

## 🔍 问题
日志显示用户已经拥有产品（从之前的测试购买），导致所有权检查阻止了新的购买尝试。

## 🛠️ 解决方案

### 方法 1: 清除 StoreKit 测试交易（推荐）

#### 在 Xcode 中：
1. 打开 Xcode 项目
2. 在顶部菜单：**Product** → **Scheme** → **Edit Scheme...**
3. 选择 **Run** → **Options** 标签
4. 在 **StoreKit Configuration** 部分，点击 **Manage StoreKit Transactions...**
5. 在弹出窗口中，选择要清除的交易
6. 点击 **Delete** 删除测试交易
7. 或者点击 **Delete All** 清除所有测试交易

#### 或者重置整个 StoreKit 配置：
1. 在 Scheme 编辑器中，取消选择 StoreKit Configuration
2. 保存并运行一次应用
3. 再次选择 StoreKit Configuration
4. 重新运行应用

### 方法 2: 重置 iOS 模拟器

1. 在 iOS 模拟器中：**Device** → **Erase All Content and Settings...**
2. 这会清除所有模拟器数据，包括 StoreKit 测试交易
3. 重新安装应用

### 方法 3: 使用代码修改（已实现）

代码已经修改为在开发环境中允许跳过所有权检查。在 `__DEV__` 模式下，即使检测到已拥有产品，也会继续尝试购买，让 Apple/StoreKit 决定是否允许。

## 📱 测试步骤

1. **清除测试数据**（使用上述方法之一）
2. **重新运行应用**
3. **尝试购买**
4. **查看日志**，应该看到：
   ```
   [RevenueCat] ✅ Product not owned, proceeding with purchase
   [RevenueCat] 💳 Calling Purchases.purchasePackage() - Apple payment sheet should appear now
   ```

## ⚠️ 重要提示

- **开发环境** (`__DEV__ = true`): 允许跳过所有权检查，继续尝试购买
- **生产环境** (`__DEV__ = false`): 严格检查所有权，阻止重复购买

这样可以：
- 在开发中方便测试（不需要每次都清除数据）
- 在生产中保护用户（防止重复购买）

## 🔄 如果问题仍然存在

如果清除数据后仍然显示已拥有产品：

1. **检查 RevenueCat Dashboard**:
   - 登录 RevenueCat Dashboard
   - 查看测试用户的购买历史
   - 可能需要清除测试数据

2. **检查 App Store Connect**:
   - 如果使用 TestFlight，检查沙盒测试账户
   - 清除测试账户的购买历史

3. **使用全新的测试账户**:
   - 创建全新的 Apple ID
   - 使用新账户登录应用
   - 测试购买流程


