# StoreKit Configuration 测试指南

## 🚀 快速开始

### 1. Xcode 配置步骤
1. 打开 Xcode 项目 (`ios/GoFitAI.xcworkspace`)
2. 确保 `GoFitAI.storekit` 文件已添加到项目中
3. 编辑 Scheme：
   - 点击顶部工具栏的 scheme 下拉菜单
   - 选择 "Edit Scheme..."
   - 左侧选择 "Run" → "Options" 标签
   - 在 "StoreKit Configuration" 下拉菜单中选择 "GoFitAI.storekit"
   - 点击 "Close" 保存

### 2. 测试产品信息
- **月度订阅**: `gofitai_premium_monthly1` - ¥30.00/月
- **终身购买**: `gofitai_premium_lifetime1` - ¥298.00 一次性

### 3. 测试步骤
1. 清理并重新构建项目
2. 在模拟器或设备上运行应用
3. 导航到订阅页面
4. 尝试购买产品
5. 验证购买流程和 RevenueCat 集成

### 4. 预期结果
- ✅ 应用应该能够获取产品信息
- ✅ 显示正确的价格和描述
- ✅ 购买流程应该正常工作
- ✅ RevenueCat 应该正确处理购买事件

### 5. 故障排除
如果仍然看到 "None of the products could be fetched" 错误：
1. 确认 StoreKit Configuration 文件在 Xcode 项目中
2. 确认 Scheme 配置正确
3. 清理项目并重新构建
4. 重启 Xcode 和模拟器

### 6. 测试用户
StoreKit Configuration 会自动创建测试环境，无需额外的测试用户配置。

## 🔍 调试信息
如果需要调试，查看控制台日志中的：
- `[RevenueCat]` 相关日志
- StoreKit 产品获取状态
- 购买流程状态




