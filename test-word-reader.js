#!/usr/bin/env node

/**
 * Word文档读取功能测试脚本
 * 用于测试Word文档读取是否正常工作
 */

const { readWordDocument } = require('./lib/word-reader')

async function testWordReader() {
  console.log('🔍 测试Word文档读取功能...')
  console.log('================================')

  try {
    // 测试Word文档读取
    console.log('1️⃣ 测试Word文档读取...')
    const wordContent = await readWordDocument('/隐私政策与用户数据使用条款_clean_Aug2025.docx')
    
    console.log('✅ Word文档读取成功！')
    console.log(`   标题: ${wordContent.title}`)
    console.log(`   更新时间: ${wordContent.lastUpdated}`)
    console.log(`   内容长度: ${wordContent.content.length} 字符`)
    console.log(`   内容预览: ${wordContent.content.substring(0, 200)}...`)
    
    console.log('\n🎉 Word文档读取功能测试完成！')
    console.log('================================')

  } catch (error) {
    console.error('❌ Word文档读取测试失败:', error.message)
    console.error('详细错误信息:', error)
  }
}

// 运行测试
testWordReader()
