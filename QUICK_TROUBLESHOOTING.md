# 快速故障排除指南

## 🚨 常见问题解决

### 1. Expo 服务器问题
```bash
# 杀死占用的进程
lsof -ti:8081 | xargs kill -9

# 重新启动
npx expo start
```

### 2. iOS 模拟器问题
```bash
# 重置模拟器
npx expo run:ios --simulator="iPhone 15 Pro"
```

### 3. 缓存问题
```bash
# 清除缓存
npx expo start --clear
```

### 4. RevenueCat 配置检查
- 确保 Packages 已创建
- 确保 Packages 已添加到 Offering
- 检查 Package IDs 是否正确

### 5. StoreKit 测试
- 确保在 iOS 模拟器中测试
- 检查 StoreKit Configuration 文件是否存在

## 🎯 测试订阅的步骤

1. **启动应用** → 在模拟器中打开
2. **导航到付费墙** → 查看套餐显示
3. **选择套餐** → 点击购买按钮
4. **StoreKit 弹窗** → 应该显示购买界面
5. **完成购买** → 检查订阅状态

## 📞 需要帮助时

如果遇到任何问题，请提供：
1. 错误信息截图
2. 控制台日志
3. 当前进行到哪一步




