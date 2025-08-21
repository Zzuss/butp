#!/usr/bin/env node

/**
 * 隐私条款功能测试脚本
 * 用于测试隐私条款API和数据库操作
 */

const { supabase } = require('./lib/supabase')

async function testPrivacyAgreement() {
  console.log('🔍 测试隐私条款功能...')
  console.log('================================')

  try {
    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...')
    const { data: testData, error: testError } = await supabase
      .from('privacy_agreement')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.error('❌ 数据库连接失败:', testError.message)
      return
    }
    console.log('✅ 数据库连接成功')

    // 2. 检查privacy_agreement表结构
    console.log('\n2️⃣ 检查privacy_agreement表结构...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('privacy_agreement')
      .select('*')
      .limit(0)
    
    if (tableError) {
      console.error('❌ 表结构检查失败:', tableError.message)
      return
    }
    console.log('✅ privacy_agreement表存在')

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

    // 4. 测试插入新记录
    console.log('\n4️⃣ 测试插入新记录...')
    const testHash = 'test_hash_' + Date.now()
    const { data: insertData, error: insertError } = await supabase
      .from('privacy_agreement')
      .insert([{ SNH: testHash }])
      .select()
    
    if (insertError) {
      console.error('❌ 插入测试记录失败:', insertError.message)
      return
    }
    console.log('✅ 插入测试记录成功:', insertData[0])

    // 5. 测试查询记录
    console.log('\n5️⃣ 测试查询记录...')
    const { data: queryData, error: queryError } = await supabase
      .from('privacy_agreement')
      .select('*')
      .eq('SNH', testHash)
      .single()
    
    if (queryError) {
      console.error('❌ 查询测试记录失败:', queryError.message)
      return
    }
    console.log('✅ 查询测试记录成功:', queryData)

    // 6. 测试删除测试记录
    console.log('\n6️⃣ 清理测试记录...')
    const { error: deleteError } = await supabase
      .from('privacy_agreement')
      .delete()
      .eq('SNH', testHash)
    
    if (deleteError) {
      console.error('❌ 删除测试记录失败:', deleteError.message)
      return
    }
    console.log('✅ 测试记录清理成功')

    // 7. 测试Word文档读取（如果可用）
    console.log('\n7️⃣ 测试Word文档读取...')
    try {
      const { readWordDocument } = require('./lib/word-reader')
      const wordContent = await readWordDocument('/隐私政策与用户数据使用条款_clean_Aug2025.docx')
      console.log('✅ Word文档读取成功')
      console.log(`   标题: ${wordContent.title}`)
      console.log(`   更新时间: ${wordContent.lastUpdated}`)
      console.log(`   内容长度: ${wordContent.content.length} 字符`)
    } catch (wordError) {
      console.log('⚠️  Word文档读取失败（这是正常的，因为文件可能不存在）:', wordError.message)
    }

    console.log('\n🎉 所有测试完成！')
    console.log('================================')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
}

// 运行测试
testPrivacyAgreement()
