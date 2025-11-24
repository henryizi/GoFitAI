# 🚀 TestFlight 构建指南

## 📋 当前状态检查

### ✅ 已完成的配置
- **StoreKit Configuration**: `GoFitAI.storekit` 已配置
  - Monthly: `gofitai_premium_monthly1` ($30.00)
  - Lifetime: `gofitai_premium_lifetime1` ($298.00)
- **EAS Build 配置**: `eas.json` 已设置
- **App Store Connect**: App ID `6752763510` 已配置
- **RevenueCat 代码**: 已配置真实购买模式

### ⚠️ 需要完成的关键步骤

## 🔧 第1步: 完成 RevenueCat Dashboard 配置

**这是最重要的步骤！** 必须在构建前完成：

1. **登录 RevenueCat Dashboard**: https://app.revenuecat.com/
2. **创建 Products**:
   ```
   Product ID: gofitai_premium_monthly1
   Type: Auto-renewable subscription
   Duration: 1 month
   
   Product ID: gofitai_premium_lifetime1
   Type: Non-consumable
   ```

3. **创建 Packages**:
   ```
   Package 1:
   - Identifier: monthly_premium
   - Product: gofitai_premium_monthly1
   
   Package 2:
   - Identifier: lifetime_premium
   - Product: gofitai_premium_lifetime1
   ```

4. **创建 Offering**:
   ```
   Offering ID: default
   Packages: 添加上面两个 packages
   ```

5. **创建 Entitlement**:
   ```
   Entitlement ID: premium
   Products: 添加两个产品
   ```

## 🏗️ 第2步: 构建 TestFlight 版本

### 更新版本号
```bash
# 增加 build number
npx expo install --fix
```

### 构建应用
```bash
# 构建 TestFlight 版本
eas build --platform ios --profile testflight

# 或者同时构建生产版本
eas build --platform ios --profile production
```

### 上传到 TestFlight
```bash
# 自动上传到 App Store Connect
eas submit --platform ios --profile testflight
```

## 📱 第3步: TestFlight 测试

### 在 TestFlight 中测试订阅
1. **下载 TestFlight 应用**
2. **安装你的应用**
3. **导航到付费墙页面**
4. **测试购买流程**:
   - 选择月度订阅
   - 选择终身购买
   - 验证 Apple 购买界面显示
   - 完成测试购买

### 验证功能
- [ ] 应用正常启动
- [ ] 用户注册/登录
- [ ] 付费墙显示正确价格
- [ ] 购买流程正常工作
- [ ] 订阅状态正确显示
- [ ] 高级功能解锁

## 🐛 故障排除

### 🚨 常见错误: Provisioning Profile Capability Missing
如果看到类似以下的错误：
`Provisioning profile doesn't support the Sign in with Apple capability`

**原因**: 你最近添加了 Apple 登录功能，但 EAS 服务器上缓存的 Provisioning Profile 是旧的（添加功能之前创建的）。

**解决步骤**:
1. 运行以下命令管理凭证：
   ```bash
   npx eas-cli credentials
   ```
2. 选择 **iOS**
3. 选择 **production** (或 build 使用的 profile)
4. 选择 **Provisioning Profiles**
5. 找到并 **删除** (Delete) 旧的 profile (查看创建日期)
6. 重新运行构建命令，EAS 会自动生成新的 profile

### RevenueCat 相关错误
```
Error: "None of the products registered"
解决: 完成 RevenueCat Dashboard 配置

Error: "Couldn't find package"
解决: 检查 Package IDs 是否匹配

Error: Invalid API key
解决: 检查 .env 中的 EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
```

### 构建相关错误
```
Error: Code signing
解决: 确保在 Apple Developer 账户中有有效证书

Error: Bundle identifier
解决: 确保 com.henrymadeit.gofitai 在 App Store Connect 中注册
```

## 📞 需要帮助？

如果遇到问题，请提供：
1. 错误信息截图
2. RevenueCat Dashboard 配置截图
3. 构建日志
4. TestFlight 测试结果

## 🎯 成功标准

构建成功的标志：
- [ ] EAS 构建完成无错误
- [ ] 应用成功上传到 TestFlight
- [ ] 在 TestFlight 中可以下载和安装
- [ ] 订阅功能正常工作
- [ ] 购买流程显示正确价格
- [ ] 购买完成后功能正确解锁
