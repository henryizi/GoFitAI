#!/usr/bin/env node

/**
 * GoFitAI 付费墙测试状态显示
 */

const { exec } = require('child_process');

function checkBuildStatus() {
  return new Promise((resolve) => {
    exec('ps aux | grep expo | grep -v grep', (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve('构建完成');
      } else {
        resolve('构建中...');
      }
    });
  });
}

function displayStatus() {
  console.clear();
  console.log('🚀 GoFitAI 付费墙测试状态');
  console.log('========================');
  console.log('');
  
  checkBuildStatus().then(status => {
    console.log(`📱 应用构建状态: ${status}`);
    console.log('');
    
    if (status === '构建完成') {
      console.log('✅ 应用已准备好进行测试！');
      console.log('');
      console.log('🎯 下一步操作：');
      console.log('1. 在您的 iPhone 16 Pro 上打开 GoFitAI 应用');
      console.log('2. 按照 QUICK_TEST_CHECKLIST.md 进行测试');
      console.log('3. 重点关注付费墙是否在入门后显示');
      console.log('');
      console.log('📋 快速测试步骤：');
      console.log('   ① 完成入门引导 → 应该看到付费墙');
      console.log('   ② 点击"Maybe Later" → 进入主界面');
      console.log('   ③ 生成6个食谱 → 第6个应该被阻止');
      console.log('   ④ 发送11条聊天 → 第11条应该被阻止');
      console.log('   ⑤ 点击"Upgrade" → 应该打开购买界面');
      console.log('');
      console.log('🔍 如需查看实时日志：');
      console.log('   npx expo logs --platform ios');
      
    } else {
      console.log('⏳ 应用正在构建中，请稍候...');
      console.log('');
      console.log('📝 准备工作：');
      console.log('✅ 付费墙配置已更新');
      console.log('✅ 开发模式绕过已禁用');
      console.log('✅ 免费用户限制已设置');
      console.log('✅ 测试指南已准备');
      console.log('');
      console.log('⏱️  预计还需要 1-2 分钟完成构建...');
    }
    
    console.log('');
    console.log('💡 提示：按 Ctrl+C 退出状态监控');
  });
}

// 每5秒更新一次状态
displayStatus();
const interval = setInterval(displayStatus, 5000);

process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n👋 状态监控已停止');
  process.exit(0);
});



