#!/usr/bin/env node

/**
 * Umami配置检查脚本
 * 运行: node check-umami-config.js
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔍 检查Umami配置...\n')

const config = {
  UMAMI_BASE_URL: process.env.UMAMI_BASE_URL,
  UMAMI_USERNAME: process.env.UMAMI_USERNAME,
  UMAMI_PASSWORD: process.env.UMAMI_PASSWORD,
  UMAMI_WEBSITE_ID: process.env.UMAMI_WEBSITE_ID,
}

console.log('📋 环境变量检查:')
console.log('================')

let hasAllConfig = true

Object.entries(config).forEach(([key, value]) => {
  const status = value ? '✅' : '❌'
  const displayValue = key.includes('PASSWORD') ? (value ? '***隐藏***' : '未设置') : (value || '未设置')
  console.log(`${status} ${key}: ${displayValue}`)
  
  if (!value) {
    hasAllConfig = false
  }
})

console.log('\n📝 配置建议:')
console.log('============')

if (!hasAllConfig) {
  console.log('❌ 缺少必要的环境变量配置')
  console.log('📁 请在 .env.local 文件中添加以下配置:')
  console.log('')
  console.log('# Umami API 访问配置')
  console.log('UMAMI_BASE_URL=https://umami-ruby-chi.vercel.app')
  console.log('UMAMI_USERNAME=your-umami-username')
  console.log('UMAMI_PASSWORD=your-umami-password')
  console.log('UMAMI_WEBSITE_ID=ddf456a9-f046-48b0-b27b-95a6dc0182b9')
  console.log('')
  console.log('🔗 获取登录凭据：https://umami-ruby-chi.vercel.app/dashboard')
} else {
  console.log('✅ 所有环境变量已配置')
  console.log('🧪 接下来可以：')
  console.log('   1. 启动开发服务器: npm run dev')
  console.log('   2. 访问测试页面: http://localhost:3000/test-umami')
  console.log('   3. 查看关于页面: http://localhost:3000/about')
}

console.log('\n🔧 故障排除:')
console.log('============')
console.log('• 确保用户名和密码可以登录 Umami 仪表板')
console.log('• 检查网络连接是否正常')
console.log('• 验证网站ID是否正确')
console.log('• 查看控制台错误信息')

// 如果配置完整，尝试测试连接
if (hasAllConfig) {
  console.log('\n🌐 测试连接...')
  console.log('===============')
  
  // 这里可以添加简单的连接测试，但为了简单起见先跳过
  console.log('💡 运行完整测试请访问: /test-umami')
}

console.log('\n📚 相关文档:')
console.log('===========')
console.log('• 集成指南: UMAMI_INTEGRATION_GUIDE.md')
console.log('• 环境变量模板: env.template')
console.log('• Umami仪表板: https://umami-ruby-chi.vercel.app/dashboard')

console.log('\n🎯 完成！') 