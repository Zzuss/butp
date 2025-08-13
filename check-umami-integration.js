// Umami 集成状态检查脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 检查 BuTP 项目中的 Umami 集成状态...\n');

// 检查关键文件
const filesToCheck = [
  'components/analytics/UmamiAnalytics.tsx',
  'app/layout.tsx', 
  'lib/umami-api.ts',
  'lib/analytics.ts',
  'app/api/umami-stats/route.ts',
  'components/analytics/VisitorStats.tsx',
  'app/about/page.tsx'
];

let allGood = true;

// 新的 Umami 服务配置
const newConfig = {
  baseUrl: 'https://umami-teal-omega.vercel.app',
  websiteId: 'ec362d7d-1d62-46c2-8338-6e7c0df7c084',
  scriptUrl: 'https://umami-teal-omega.vercel.app/script.js'
};

// 旧的配置（应该被替换）
const oldConfig = {
  baseUrl: 'https://umami-ruby-chi.vercel.app',
  websiteId: 'ddf456a9-f046-48b0-b27b-95a6dc0182b9'
};

console.log('📋 检查关键文件...');

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`✅ ${file} - 存在`);
    
    // 检查是否包含旧的配置
    if (content.includes(oldConfig.baseUrl)) {
      console.log(`   ⚠️  仍包含旧的 Umami 地址: ${oldConfig.baseUrl}`);
      allGood = false;
    }
    
    if (content.includes(oldConfig.websiteId)) {
      console.log(`   ⚠️  仍包含旧的网站ID: ${oldConfig.websiteId}`);
      allGood = false;
    }
    
    // 检查是否包含新的配置
    if (content.includes(newConfig.baseUrl) || content.includes(newConfig.websiteId)) {
      console.log(`   ✅ 包含新的 Umami 配置`);
    }
    
  } else {
    console.log(`❌ ${file} - 不存在`);
    allGood = false;
  }
});

console.log('\n🔧 检查环境变量配置...');

// 检查环境变量模板
const envTemplate = path.join(__dirname, 'env.template');
if (fs.existsSync(envTemplate)) {
  const content = fs.readFileSync(envTemplate, 'utf8');
  
  if (content.includes(newConfig.websiteId)) {
    console.log('✅ env.template - 包含新的网站ID');
  } else {
    console.log('⚠️  env.template - 可能需要更新网站ID');
  }
  
  if (content.includes('NEXT_PUBLIC_ENABLE_ANALYTICS=true')) {
    console.log('✅ env.template - 包含分析启用配置');
  }
} else {
  console.log('❌ env.template - 不存在');
}

// 检查示例环境变量文件
const envExample = path.join(__dirname, 'env.local.example');
if (fs.existsSync(envExample)) {
  console.log('✅ env.local.example - 存在');
} else {
  console.log('⚠️  env.local.example - 不存在');
}

console.log('\n📊 关键配置信息:');
console.log(`🌐 新的 Umami 服务: ${newConfig.baseUrl}`);
console.log(`🆔 网站ID: ${newConfig.websiteId}`);
console.log(`📜 追踪脚本: ${newConfig.scriptUrl}`);

console.log('\n📝 使用说明:');
console.log('1. 创建 .env.local 文件启用分析功能:');
console.log('   cp env.local.example .env.local');
console.log('');
console.log('2. 访问关于页面查看真实统计:');
console.log('   http://localhost:3000/about');
console.log('');
console.log('3. 查看 Umami 仪表板:');
console.log(`   ${newConfig.baseUrl}/login`);
console.log('   用户名: admin');
console.log('   密码: umami');

if (allGood) {
  console.log('\n🎉 Umami 集成检查完成 - 所有配置正常!');
} else {
  console.log('\n⚠️  发现一些需要注意的问题，请检查上面的警告信息');
}

console.log('\n📚 相关文档:');
console.log('- UMAMI_INTEGRATION_GUIDE.md');
console.log('- VISITOR_STATS_USAGE_GUIDE.md');
console.log('- test-umami-connection.js (连接测试)'); 