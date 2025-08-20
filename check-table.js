#!/usr/bin/env node

/**
 * 直接查询privacy_agreement表
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
  console.log('🔍 检查privacy_agreement表...')
  console.log('================================')

  try {
    // 1. 尝试查询表结构
    console.log('1️⃣ 查询表结构...')
    const { data: tableData, error: tableError } = await supabase
      .from('privacy_agreement')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('❌ 表查询失败:', tableError)
      console.log('错误代码:', tableError.code)
      console.log('错误消息:', tableError.message)
      console.log('错误详情:', tableError.details)
      return
    }
    
    console.log('✅ 表查询成功')
    console.log('表数据:', tableData)

    // 2. 尝试插入测试数据
    console.log('\n2️⃣ 尝试插入测试数据...')
    const testHash = 'test_hash_' + Date.now()
    const { data: insertData, error: insertError } = await supabase
      .from('privacy_agreement')
      .insert([{ SNH: testHash }])
      .select()
    
    if (insertError) {
      console.error('❌ 插入测试数据失败:', insertError)
      console.log('错误代码:', insertError.code)
      console.log('错误消息:', insertError.message)
      return
    }
    
    console.log('✅ 插入测试数据成功:', insertData)

    // 3. 查询插入的数据
    console.log('\n3️⃣ 查询插入的数据...')
    const { data: queryData, error: queryError } = await supabase
      .from('privacy_agreement')
      .select('*')
      .eq('SNH', testHash)
    
    if (queryError) {
      console.error('❌ 查询测试数据失败:', queryError)
      return
    }
    
    console.log('✅ 查询测试数据成功:', queryData)

    // 4. 删除测试数据
    console.log('\n4️⃣ 清理测试数据...')
    const { error: deleteError } = await supabase
      .from('privacy_agreement')
      .delete()
      .eq('SNH', testHash)
    
    if (deleteError) {
      console.error('❌ 删除测试数据失败:', deleteError)
      return
    }
    
    console.log('✅ 测试数据清理成功')

    // 5. 查看所有现有数据
    console.log('\n5️⃣ 查看所有现有数据...')
    const { data: allData, error: allError } = await supabase
      .from('privacy_agreement')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ 查询所有数据失败:', allError)
      return
    }
    
    if (allData && allData.length > 0) {
      console.log(`✅ 找到 ${allData.length} 条记录:`)
      allData.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}, SNH: ${record.SNH?.substring(0, 20)}..., 创建时间: ${record.created_at}`)
      })
    } else {
      console.log('ℹ️  暂无数据记录')
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  }

  console.log('\n🎉 表检查完成！')
  console.log('================================')
}

// 运行检查
checkTable()
