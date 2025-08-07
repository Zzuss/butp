#!/usr/bin/env node

/**
 * Umami连接测试脚本
 * 直接测试网络连接和API响应
 */

require('dotenv').config({ path: '.env.local' })
const https = require('https')
const http = require('http')

console.log('🔍 Umami 连接诊断工具')
console.log('=' .repeat(50))

async function testConnection() {
  console.log('📋 环境变量检查:')
  const requiredVars = ['UMAMI_BASE_URL', 'UMAMI_USERNAME', 'UMAMI_PASSWORD', 'UMAMI_WEBSITE_ID']
  let configOk = true
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      console.log(`✅ ${varName}: ${varName.includes('PASSWORD') ? '***已设置***' : value}`)
    } else {
      console.log(`❌ ${varName}: 未设置`)
      configOk = false
    }
  })
  
  if (!configOk) {
    console.log('\n❌ 环境变量配置不完整，请检查 .env.local 文件')
    return
  }

  console.log('\n🌐 网络连接测试:')
  console.log('═' .repeat(30))
  
  // 测试基础网络连接
  try {
    console.log('🔄 测试基础网络连接...')
    const testResponse = await fetch('https://httpbin.org/status/200', { 
      signal: AbortSignal.timeout(5000) 
    })
    if (testResponse.ok) {
      console.log('✅ 基础网络连接正常')
    } else {
      console.log('⚠️ 基础网络连接异常')
    }
  } catch (error) {
    console.log('❌ 基础网络连接失败:', error.message)
    console.log('💡 建议: 检查网络连接、防火墙或代理设置')
    return
  }

  // 测试Umami服务器连接
  const baseUrl = process.env.UMAMI_BASE_URL
  console.log(`\n🔄 测试 Umami 服务器连接: ${baseUrl}`)
  
  try {
    const startTime = Date.now()
    const response = await fetch(baseUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    })
    const duration = Date.now() - startTime
    
    if (response.ok) {
      console.log(`✅ Umami 服务器可达 (${duration}ms)`)
      console.log(`   状态码: ${response.status}`)
      console.log(`   服务器: ${response.headers.get('server') || '未知'}`)
    } else {
      console.log(`⚠️ Umami 服务器响应异常: ${response.status}`)
    }
  } catch (error) {
    console.log('❌ Umami 服务器连接失败:', error.message)
    if (error.name === 'TimeoutError') {
      console.log('💡 建议: 连接超时，可能是网络问题或服务器暂时不可用')
    }
    return
  }

  // 测试认证
  console.log('\n🔑 测试 Umami 认证:')
  console.log('═' .repeat(25))
  
  try {
    console.log('🔄 尝试登录...')
    const authResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.UMAMI_USERNAME,
        password: process.env.UMAMI_PASSWORD
      }),
      signal: AbortSignal.timeout(10000)
    })

    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log('✅ 认证成功')
      console.log(`   令牌: ${authData.token ? authData.token.substring(0, 20) + '...' : '未获取到'}`)
      
      // 测试数据获取
      if (authData.token) {
        console.log('\n📊 测试数据获取:')
        console.log('═' .repeat(20))
        
        try {
          const websiteId = process.env.UMAMI_WEBSITE_ID
          const now = Date.now()
          const yesterday = now - 24 * 60 * 60 * 1000
          
          const statsResponse = await fetch(
            `${baseUrl}/api/websites/${websiteId}/stats?startAt=${yesterday}&endAt=${now}`,
            {
              headers: { 'Authorization': `Bearer ${authData.token}` },
              signal: AbortSignal.timeout(10000)
            }
          )

          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            console.log('✅ 数据获取成功')
            console.log(`   页面浏览量: ${statsData.pageviews?.value || 0}`)
            console.log(`   访客数: ${statsData.visitors?.value || 0}`)
            console.log(`   访问次数: ${statsData.visits?.value || 0}`)
          } else {
            const errorText = await statsResponse.text()
            console.log(`❌ 数据获取失败: ${statsResponse.status}`)
            console.log(`   错误信息: ${errorText}`)
            if (statsResponse.status === 404) {
              console.log('💡 建议: 检查 UMAMI_WEBSITE_ID 是否正确')
            }
          }
        } catch (error) {
          console.log('❌ 数据获取异常:', error.message)
        }
      }
    } else {
      const errorText = await authResponse.text()
      console.log(`❌ 认证失败: ${authResponse.status}`)
      console.log(`   错误信息: ${errorText}`)
      if (authResponse.status === 401) {
        console.log('💡 建议: 检查用户名和密码是否正确')
      }
    }
  } catch (error) {
    console.log('❌ 认证过程异常:', error.message)
    if (error.name === 'TimeoutError') {
      console.log('💡 建议: 认证超时，可能是网络延迟问题')
    }
  }

  console.log('\n📋 诊断完成')
  console.log('=' .repeat(50))
  console.log('🔗 有用的链接:')
  console.log(`   • Umami 控制台: ${baseUrl}/dashboard`)
  console.log('   • 本地测试页面: http://localhost:3000/test-umami-connection')
  console.log('   • 访问统计页面: http://localhost:3000/about')
  console.log('   • API 调试接口: http://localhost:3000/api/umami-stats')
}

// 执行诊断
testConnection().catch(error => {
  console.error('❌ 诊断工具异常:', error.message)
}) 