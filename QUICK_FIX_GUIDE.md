# 🚨 GoFitAI 快速修复指南

## 问题 1: Apple Sign-In Audience 错误

### 🔧 立即修复步骤：
1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 选择你的 GoFitAI 项目

2. **修改 Apple Provider 配置**
   - 导航到：Authentication → Providers → Apple
   - 找到 "Client ID" 字段
   - **当前值**：`com.henrymadeit.gofitai`
   - **修改为**：`host.exp.Exponent,com.henrymadeit.gofitai`
   - 或者临时使用：`host.exp.Exponent` (仅开发环境)

3. **保存并等待**
   - 点击 "Save" 保存配置
   - 等待 2-3 分钟让更改生效

---

## 问题 2: StoreKit Configuration 未生效

### 🎯 Xcode 配置检查清单：

#### ✅ 步骤 1: 确认文件已添加
1. 打开 Xcode 项目 (`ios/GoFitAI.xcworkspace`)
2. 在项目导航器中查找 `GoFitAI.storekit`
3. 如果没有找到：
   - 右键点击项目根目录
   - 选择 "Add Files to 'GoFitAI'"
   - 选择 `/Users/ngkwanho/Desktop/GoFitAI/GoFitAI.storekit`

#### ✅ 步骤 2: 配置 Scheme
1. 点击 Xcode 顶部工具栏的 scheme 下拉菜单 (显示 "GoFitAI")
2. 选择 "Edit Scheme..."
3. 左侧选择 "Run"
4. 点击 "Options" 标签
5. 在 "StoreKit Configuration" 下拉菜单中选择 "GoFitAI.storekit"
6. 点击 "Close" 保存

#### ✅ 步骤 3: 清理并重建
1. 在 Xcode 中：Product → Clean Build Folder (Cmd+Shift+K)
2. 重新运行项目 (Cmd+R)

---

## 🧪 测试验证

### Apple Sign-In 测试：
1. 尝试 Apple 登录
2. 应该不再看到 "Unacceptable audience" 错误

### StoreKit 测试：
1. 导航到订阅页面
2. 应该能看到产品信息：
   - 月度订阅：¥30.00/月
   - 终身购买：¥298.00
3. 不应该看到 "None of the products could be fetched" 错误

---

## 🚨 如果问题仍然存在

### Apple Sign-In 问题：
- 确认 Supabase 配置已保存
- 等待 5 分钟后重试
- 检查网络连接

### StoreKit 问题：
- 确认 StoreKit 文件在 Xcode 项目中
- 确认 Scheme 配置正确
- 重启 Xcode 和模拟器
- 检查 iOS 模拟器版本 (建议 iOS 15+)

---

## 📞 需要帮助？

如果按照以上步骤操作后问题仍然存在，请提供：
1. Xcode 控制台的最新日志
2. Supabase Apple Provider 配置截图
3. Xcode Scheme 配置截图

我会立即协助进一步调试！




