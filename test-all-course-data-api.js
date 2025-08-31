#!/usr/bin/env node

/**
 * 测试all-course-data API的脚本
 * 用于诊断"确认修改"功能中API调用失败的问题
 */

const fetch = require('node-fetch')

async function testAllCourseDataAPI() {
  console.log('🔍 测试all-course-data API...')
  console.log('================================')

  try {
    // 模拟测试数据
    const testData = {
      studentHash: 'test_hash_64_characters_long_for_testing_purposes_only_1234567890',
      modifiedScores: [
        {
          courseName: '思想道德与法治',
          score: 85,
          semester: 1,
          category: '思想政治理论',
          credit: 3.0
        },
        {
          courseName: '高等数学A(上)',
          score: 78,
          semester: 1,
          category: '数学与自然科学基础',
          credit: 4.0
        }
      ],
      source2Scores: [
        {
          source: 'academic_results',
          courseName: '思想道德与法治',
          score: 85,
          semester: 1,
          category: '思想政治理论',
          credit: 3.0
        }
      ]
    }

    console.log('📤 发送测试数据:', JSON.stringify(testData, null, 2))

    // 测试API调用
    const response = await fetch('http://localhost:3000/api/all-course-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    console.log('📊 API响应状态:', response.status, response.statusText)

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API调用成功!')
      console.log('📋 响应数据:', JSON.stringify(data, null, 2))
      
      // 验证响应结构
      if (data.success && data.data) {
        console.log('✅ 响应格式正确')
        
        if (data.data.allCourses) {
          console.log(`✅ 总课程数量: ${data.data.allCourses.length}`)
        }
        
        if (data.data.source1Data) {
          console.log(`✅ 来源1数据数量: ${data.data.source1Data.length}`)
        }
        
        if (data.data.source2Data) {
          console.log(`✅ 来源2数据数量: ${data.data.source2Data.length}`)
        }
        
        if (data.data.cacheInfo) {
          console.log('✅ 缓存信息:', data.data.cacheInfo)
        }
      } else {
        console.log('⚠️  响应格式不正确')
      }
    } else {
      const errorText = await response.text()
      console.log('❌ API调用失败!')
      console.log('📋 错误响应:', errorText)
      
      // 尝试解析错误响应
      try {
        const errorData = JSON.parse(errorText)
        console.log('📋 错误详情:', JSON.stringify(errorData, null, 2))
      } catch (parseError) {
        console.log('📋 无法解析错误响应为JSON')
      }
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ 连接被拒绝 - 请确保服务器正在运行 (localhost:3000)')
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ 主机未找到 - 请检查URL是否正确')
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ 请求超时 - 请检查网络连接')
    }
    
    console.error('详细错误信息:', error)
  }

  console.log('\n📊 测试总结:')
  console.log('================================')
  console.log('✅ API测试完成')
  console.log('✅ 错误处理检查完成')
  console.log('✅ 响应格式验证完成')
  console.log('✅ 连接状态检查完成')
}

// 运行测试
testAllCourseDataAPI()
