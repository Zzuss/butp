#!/usr/bin/env node

/**
 * 检查privacy_policy表的结构
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPrivacyPolicyTable() {
  console.log('🔍 检查privacy_policy表...')
  console.log('================================')

  try {
    // 1. 查看现有数据的结构
    console.log('1️⃣ 查看表数据结构...')
    const { data: sampleData, error: sampleError } = await supabase
      .from('privacy_policy')
      .select('*')
      .limit(5)
    
    if (sampleError) {
      console.error('❌ 查询失败:', sampleError)
      return
    }
    
    console.log('✅ 表查询成功')
    console.log('样本数据:', sampleData)
    
    if (sampleData && sampleData.length > 0) {
      console.log('\n表字段:')
      Object.keys(sampleData[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleData[0][key]}`)
      })
    }

    // 2. 查看所有数据
    console.log('\n2️⃣ 查看所有数据...')
    const { data: allData, error: allError } = await supabase
      .from('privacy_policy')
      .select('*')
      .limit(10)
    
    if (allError) {
      console.error('❌ 查询所有数据失败:', allError)
      return
    }
    
    if (allData && allData.length > 0) {
      console.log(`✅ 找到 ${allData.length} 条记录:`)
      allData.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}`)
        Object.keys(record).forEach(key => {
          if (key !== 'id') {
            const value = record[key]
            const displayValue = typeof value === 'string' && value.length > 50 
              ? value.substring(0, 50) + '...' 
              : value
            console.log(`      ${key}: ${displayValue}`)
          }
        })
        console.log('   ---')
      })
    } else {
      console.log('ℹ️  暂无数据记录')
    }

    // 3. 测试插入数据（如果有SNH字段）
    console.log('\n3️⃣ 测试插入数据...')
    const testHash = 'test_hash_' + Date.now()
    
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('privacy_policy')
        .insert([{ SNH: testHash }])
        .select()
      
      if (insertError) {
        console.log('❌ 插入测试失败:', insertError.message)
        console.log('错误代码:', insertError.code)
        
        // 尝试其他可能的字段名
        const possibleFields = ['user_hash', 'student_hash', 'hash', 'user_id']
        for (const field of possibleFields) {
          try {
            const testData = {}
            testData[field] = testHash
            
            const { data: altInsertData, error: altInsertError } = await supabase
              .from('privacy_policy')
              .insert([testData])
              .select()
            
            if (!altInsertError) {
              console.log(`✅ 使用字段 ${field} 插入成功:`, altInsertData)
              
              // 清理测试数据
              await supabase
                .from('privacy_policy')
                .delete()
                .eq(field, testHash)
              
              break
            }
          } catch (e) {
            // 继续尝试下一个字段
          }
        }
      } else {
        console.log('✅ 插入测试成功:', insertData)
        
        // 清理测试数据
        await supabase
          .from('privacy_policy')
          .delete()
          .eq('SNH', testHash)
      }
    } catch (e) {
      console.log('❌ 插入测试失败:', e.message)
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  }

  console.log('\n🎉 表检查完成！')
  console.log('================================')
}

// 运行检查
checkPrivacyPolicyTable()
