#!/usr/bin/env node

/**
 * 测试数据库连接和创建隐私条款表
 */

// 直接使用Supabase配置
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...')
  console.log('================================')

  try {
    // 1. 测试基本连接
    console.log('1️⃣ 测试基本连接...')
    const { data: testData, error: testError } = await supabase
      .from('academic_results')
      .select('SNH')
      .limit(1)
    
    if (testError) {
      console.error('❌ 数据库连接失败:', testError.message)
      return
    }
    console.log('✅ 数据库连接成功')

    // 2. 检查privacy_agreement表是否存在
    console.log('\n2️⃣ 检查privacy_agreement表...')
    try {
      const { data: privacyData, error: privacyError } = await supabase
        .from('privacy_agreement')
        .select('*')
        .limit(1)
      
      if (privacyError && privacyError.code === '42P01') {
        console.log('❌ privacy_agreement表不存在，需要创建')
        console.log('请在Supabase SQL Editor中运行 create-privacy-table-simple.sql')
        return
      } else if (privacyError) {
        console.error('❌ 检查表失败:', privacyError.message)
        return
      }
      
      console.log('✅ privacy_agreement表已存在')
      
      // 3. 查看现有数据
      console.log('\n3️⃣ 查看现有隐私条款同意记录...')
      const { data: existingRecords, error: recordsError } = await supabase
        .from('privacy_agreement')
        .select('*')
        .order('SNH', { ascending: true })
      
      if (recordsError) {
        console.error('❌ 查询记录失败:', recordsError.message)
        return
      }

      if (existingRecords && existingRecords.length > 0) {
        console.log(`✅ 找到 ${existingRecords.length} 条记录:`)
        existingRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. SNH: ${record.SNH.substring(0, 20)}...`)
        })
      } else {
        console.log('ℹ️  暂无隐私条款同意记录')
      }

    } catch (error) {
      console.error('❌ 检查表时发生错误:', error.message)
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }

  console.log('\n🎉 数据库连接测试完成！')
  console.log('================================')
}

// 运行测试
testDatabaseConnection() 