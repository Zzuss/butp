#!/usr/bin/env node

/**
 * 列出数据库中所有可用的表
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
  console.log('🔍 列出数据库中所有可用的表...')
  console.log('================================')

  try {
    // 1. 检查已知的表
    console.log('1️⃣ 检查已知的表...')
    
    const knownTables = [
      'academic_results',
      'courses', 
      'Cohort2023_Predictions_ai',
  'Cohort2023_Predictions_ee',
  'Cohort2023_Predictions_tewm',
  'Cohort2023_Predictions_iot',
      'privacy_agreement',
      'privacy_agreements', // 可能的复数形式
      'privacy_policy',
      'user_agreements'
    ]
    
    for (const tableName of knownTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`❌ ${tableName}: 表不存在`)
          } else {
            console.log(`⚠️  ${tableName}: ${error.message}`)
          }
        } else {
          console.log(`✅ ${tableName}: 表存在，可以访问`)
        }
      } catch (e) {
        console.log(`❌ ${tableName}: 访问失败 - ${e.message}`)
      }
    }

    // 2. 尝试查询information_schema来获取表列表
    console.log('\n2️⃣ 尝试获取表列表...')
    try {
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_tables') // 尝试调用自定义函数
      
      if (tablesError) {
        console.log('❌ 无法获取表列表:', tablesError.message)
      } else {
        console.log('✅ 表列表:', tables)
      }
    } catch (e) {
      console.log('❌ 获取表列表失败:', e.message)
    }

    // 3. 测试其他可能的表名
    console.log('\n3️⃣ 测试其他可能的表名...')
    const possibleNames = [
      'privacy',
      'agreement',
      'user_privacy',
      'privacy_consent',
      'terms_agreement'
    ]
    
    for (const tableName of possibleNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          if (error.code === '42P01') {
            console.log(`❌ ${tableName}: 表不存在`)
          } else {
            console.log(`⚠️  ${tableName}: ${error.message}`)
          }
        } else {
          console.log(`✅ ${tableName}: 表存在，可以访问`)
        }
      } catch (e) {
        console.log(`❌ ${tableName}: 访问失败 - ${e.message}`)
      }
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  }

  console.log('\n🎉 表检查完成！')
  console.log('================================')
}

// 运行检查
listTables()
