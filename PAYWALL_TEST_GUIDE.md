# 🧪 GoFitAI 付费墙测试指南

## 🎯 测试目标
验证付费墙功能是否正常工作，包括：
- 付费墙正确显示
- 免费用户限制生效
- 购买流程正常
- 高级功能解锁

## 📱 当前配置
- ✅ **开发模式绕过：已禁用**
- ✅ **免费限制：每日5个食谱 + 10条聊天**
- ✅ **应用正在构建中...**

## 🔄 测试步骤

### 第1步：付费墙显示测试
1. 打开设备上的 GoFitAI 应用
2. 如果是新用户，完成注册和入门引导
3. **预期结果：应该自动显示付费墙界面**
4. 检查付费墙是否包含：
   - 高级功能列表
   - "Upgrade to Premium" 按钮
   - "Maybe Later" 按钮

### 第2步：免费用户限制测试
1. 点击 "Maybe Later" 跳过付费墙
2. 进入主界面后：
   - 尝试生成 **6个以上的食谱**（应该在第6个时被阻止）
   - 尝试发送 **11条以上的AI聊天消息**（应该在第11条时被阻止）
3. **预期结果：达到限制时重新显示付费墙**

### 第3步：购买流程测试
1. 在付费墙界面点击 "Upgrade to Premium"
2. **预期结果：应该打开 RevenueCat 购买界面**
3. 使用测试 Apple ID 进行购买
4. 验证购买成功后返回应用

### 第4步：高级功能验证
1. 购买成功后，验证以下功能：
   - 无限制生成食谱
   - 无限制AI聊天
   - 无限制健身计划生成
   - 高级进度跟踪功能

## 🔍 实时监控

### 查看应用日志：
```bash
npx expo logs --platform ios
```

### 关键日志信息：
- `🔍 User completed onboarding but not premium, redirecting to paywall`
- `🔍 User needs paywall, showing paywall screen`
- `⚠️ Recipe limit reached`
- `⚠️ Chat limit reached`

## 🛠️ 调试命令

### 重置应用数据：
1. 删除应用重新安装
2. 或在 iOS 设置 > GoFitAI > 重置

### 强制显示付费墙：
在应用中的开发者控制台执行：
```javascript
router.push("/paywall");
```

### 检查订阅状态：
```javascript
console.log(await RevenueCatService.isPremiumActive());
```

## ✅ 测试检查清单

- [ ] 付费墙在入门后自动显示
- [ ] "Maybe Later" 按钮正常工作
- [ ] 食谱生成限制（5个/天）生效
- [ ] AI聊天限制（10条/天）生效
- [ ] 达到限制时重新显示付费墙
- [ ] "Upgrade to Premium" 打开购买界面
- [ ] 购买流程正常完成
- [ ] 购买后解锁所有高级功能
- [ ] "恢复购买" 功能正常

## 🚨 常见问题

### 付费墙没有显示？
- 检查 `bypassPaywall` 是否设为 `false`
- 确认用户已完成入门引导
- 查看控制台日志确认逻辑流程

### 限制没有生效？
- 检查 `useSubscription` hook 的计数器
- 确认 AsyncStorage 中的使用记录
- 验证日期重置逻辑

### 购买流程失败？
- 确认 RevenueCat 配置正确
- 检查 Apple Developer 账户设置
- 使用有效的测试 Apple ID

## 🎉 测试完成

当所有测试项目都通过后，付费墙功能就可以正式发布了！

---
**注意：** 记得在发布前将 `bypassPaywall` 设回 `false` 以确保生产环境的付费墙正常工作。



