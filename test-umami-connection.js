#!/usr/bin/env node

/**
 * Umami连接测试脚本
 * 直接测试网络连接和API响应
 */

require('dotenv').config({ path: '.env.local' })

async function testUmamiConnection() {
  console.log('🌐 测试Umami连接...\n')

  const config = {
    baseUrl: process.env.UMAMI_BASE_URL || 'https://umami-ruby-chi.vercel.app',
    username: process.env.UMAMI_USERNAME || '',
    password: process.env.UMAMI_PASSWORD || '',
    websiteId: process.env.UMAMI_WEBSITE_ID || ''
  }

  console.log('📡 测试服务器连接性...')
  try {
    // 首先测试基本的网络连接
    const baseResponse = await fetch(config.baseUrl, { 
      method: 'GET',
      timeout: 5000 
    })
    console.log(`✅ 服务器响应: ${baseResponse.status} ${baseResponse.statusText}`)
  } catch (error) {
    console.log(`❌ 服务器连接失败: ${error.message}`)
    console.log('🔧 建议检查:')
    console.log('  • 网络连接是否正常')
    console.log('  • 防火墙/代理设置')
    console.log('  • Umami服务器是否在线')
    return
  }

  console.log('\n🔑 测试认证接口...')
  try {
    const authResponse = await fetch(`${config.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
      timeout: 8000
    })

    console.log(`📡 认证响应状态: ${authResponse.status}`)
    
    if (authResponse.ok) {
      const authData = await authResponse.json()
      console.log('✅ 认证成功!')
      console.log(`🎫 Token获取成功: ${authData.token ? '有效' : '无效'}`)
      
      // 测试获取统计数据
      if (authData.token) {
        console.log('\n📊 测试统计数据接口...')
        
        const endDate = new Date()
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 24小时前
        
        const params = new URLSearchParams({
          startAt: startDate.getTime().toString(),
          endAt: endDate.getTime().toString(),
        })

        const statsResponse = await fetch(
          `${config.baseUrl}/api/websites/${config.websiteId}/stats?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${authData.token}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000
          }
        )

        console.log(`📈 统计数据响应: ${statsResponse.status}`)
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          console.log('✅ 统计数据获取成功!')
          console.log('📊 数据示例:', {
            pageviews: statsData.pageviews?.value || 0,
            visitors: statsData.visitors?.value || 0,
            visits: statsData.visits?.value || 0
          })
        } else {
          const errorText = await statsResponse.text().catch(() => 'Unknown error')
          console.log(`❌ 统计数据获取失败: ${statsResponse.status}`)
          console.log(`📝 错误详情: ${errorText}`)
          
          if (statsResponse.status === 403) {
            console.log('🔧 可能的问题: 网站ID不正确或没有权限访问该网站')
          }
        }
      }
      
    } else {
      const errorText = await authResponse.text().catch(() => 'Unknown error')
      console.log(`❌ 认证失败: ${authResponse.status}`)
      console.log(`📝 错误详情: ${errorText}`)
      
      if (authResponse.status === 401) {
        console.log('🔧 可能的问题: 用户名或密码错误')
      } else if (authResponse.status === 404) {
        console.log('🔧 可能的问题: API端点不存在或URL错误')
      }
    }
    
  } catch (error) {
    console.log(`❌ 认证接口测试失败: ${error.message}`)
    
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      console.log('🔧 建议: 网络连接超时，请检查网络设置')
    }
  }

  console.log('\n🎯 测试完成!')
  console.log('\n💡 提示:')
  console.log('  • 如果认证成功但统计数据失败，检查网站ID')
  console.log('  • 如果连接超时，可能是网络或防火墙问题')
  console.log('  • 可以尝试直接访问 Umami 仪表板验证账户')
}

// 运行测试
testUmamiConnection().catch(console.error) 