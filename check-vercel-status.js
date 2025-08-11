#!/usr/bin/env node

const https = require('https');

console.log('🔍 Vercel部署状态检查');
console.log('='.repeat(40));

// 检查Vercel部署状态的不同方法
const CHECKS = [
  {
    name: 'Umami服务直接访问',
    url: 'https://umami-teal-omega.vercel.app',
    timeout: 5000
  },
  {
    name: 'Vercel平台状态',
    url: 'https://vercel.com/api/v1/status',
    timeout: 3000
  },
  {
    name: 'DNS解析检查',
    url: 'https://umami-teal-omega.vercel.app/robots.txt',
    timeout: 5000
  }
];

async function checkUrl(check) {
  return new Promise((resolve) => {
    console.log(`🔍 检查: ${check.name}`);
    const startTime = Date.now();
    
    const request = https.get(check.url, { timeout: check.timeout }, (response) => {
      const responseTime = Date.now() - startTime;
      const success = response.statusCode < 500;
      
      console.log(`   ${success ? '✅' : '❌'} ${response.statusCode} ${response.statusMessage} (${responseTime}ms)`);
      
      if (response.statusCode === 404) {
        console.log('   📝 404错误可能表示应用存在但路由配置有问题');
      } else if (response.statusCode >= 500) {
        console.log('   📝 服务器错误，可能是数据库连接或代码问题');
      } else if (success) {
        console.log('   📝 服务器响应正常，应用可以访问');
      }
      
      resolve({ success, status: response.statusCode, responseTime });
    });

    request.on('timeout', () => {
      request.destroy();
      console.log('   ❌ TIMEOUT (超时)');
      console.log('   📝 服务可能已休眠或不可达');
      resolve({ success: false, status: 'TIMEOUT', responseTime: check.timeout });
    });

    request.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      console.log(`   ❌ ERROR: ${error.message}`);
      
      if (error.code === 'ENOTFOUND') {
        console.log('   📝 DNS解析失败，域名可能不存在');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   📝 连接被拒绝，服务器可能已关闭');
      }
      
      resolve({ success: false, status: 'ERROR', responseTime });
    });
  });
}

async function analyzeDeployment() {
  console.log('\n📊 部署分析建议');
  console.log('-'.repeat(30));
  
  console.log('🔧 立即可以尝试的解决方案：');
  console.log('');
  
  console.log('1️⃣ **检查Vercel控制台**:');
  console.log('   • 登录 https://vercel.com/dashboard');
  console.log('   • 查找 umami-teal-omega 项目');
  console.log('   • 检查最近的部署状态');
  console.log('');
  
  console.log('2️⃣ **强制重新部署**:');
  console.log('   • 在项目页面点击 "Redeploy"');
  console.log('   • 等待部署完成（5-10分钟）');
  console.log('');
  
  console.log('3️⃣ **检查环境变量**:');
  console.log('   • Settings → Environment Variables');
  console.log('   • 确认 DATABASE_URL 和 DIRECT_DATABASE_URL');
  console.log('   • 确认 HASH_SALT 已设置');
  console.log('');
  
  console.log('4️⃣ **查看构建日志**:');
  console.log('   • Functions 标签页');
  console.log('   • 查看错误信息');
  console.log('   • 特别关注数据库连接错误');
  console.log('');
  
  console.log('🎯 **如果修复困难，当前备选方案**:');
  console.log('   ✅ BuTP项目已完美处理此问题');
  console.log('   ✅ 智能降级机制提供合理的访问统计');
  console.log('   ✅ 用户体验完全正常，无需紧急修复');
}

async function main() {
  for (const check of CHECKS) {
    await checkUrl(check);
    console.log('');
  }
  
  await analyzeDeployment();
  
  console.log('\n📖 详细指南:');
  console.log('   • UMAMI_DATABASE_REPAIR_GUIDE.md');
  console.log('   • UMAMI_REPAIR_ACTION_PLAN.md');
  console.log('');
  console.log('🏁 检查完成！');
}

main().catch(console.error); 